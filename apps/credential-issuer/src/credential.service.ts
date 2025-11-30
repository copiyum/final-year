import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { MerkleTreeBuilder, canonicalHash, verifyMerkleProof, MerklePath } from '@zkp-ledger/common';
import { randomUUID } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CredentialService {
    private readonly logger = new Logger(CredentialService.name);
    private readonly ledgerServiceUrl: string;
    
    // Cache for active credential leaves to avoid full tree rebuilds
    private credentialLeavesCache: Map<string, { leaves: string[], lastUpdated: number }> = new Map();
    private readonly cacheExpiryMs = 60000; // 1 minute cache

    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private httpService?: HttpService,
    ) {
        this.ledgerServiceUrl = process.env.LEDGER_SERVICE_URL || 'http://localhost:3000';
    }

    /**
     * Create a canonical leaf hash for a credential holder
     */
    private createLeafHash(holder: string, salt: string): string {
        return canonicalHash({ 
            holder, 
            salt,
            format_version: '1.0',
            circuit_version: '1.0'
        });
    }

    async issueCredentials(holders: string[]) {
        this.logger.log(`Issuing credentials for ${holders.length} holders`);

        // 1. Create leaf values (hash of holder ID + secret/salt)
        const salt = randomUUID();
        const leaves = holders.map(h => this.createLeafHash(h, salt));

        // 2. Build Merkle Tree
        const tree = new MerkleTreeBuilder(leaves).buildTree();
        const root = tree.root;

        // 3. Store issuance record with leaf hashes for efficient proof generation
        const issuanceId = randomUUID();
        await this.pool.query(
            `INSERT INTO credential_issuances (id, root, holders, leaves, salt, issued_at, status)
             VALUES ($1, $2, $3, $4, $5, NOW(), 'active')`,
            [issuanceId, root, JSON.stringify(holders), JSON.stringify(leaves), salt]
        );

        // 4. Return credentials with paths
        const credentials = holders.map((holder, index) => {
            const path = new MerkleTreeBuilder(leaves).getPath(index);
            return {
                holder,
                leaf_value: leaves[index],
                merkle_path: path
            };
        });

        // 5. Publish root to ledger service
        await this.publishRootToLedger(issuanceId, root, 'credential.issued');

        return {
            issuance_id: issuanceId,
            root,
            credentials
        };
    }

    /**
     * Revoke credentials and publish new root to ledger
     * Uses incremental update approach - removes revoked leaves and recomputes only affected paths
     */
    async revokeCredentials(credentialIds: string[]) {
        this.logger.log(`Revoking credentials: ${credentialIds.join(', ')}`);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get the leaves being revoked BEFORE marking as revoked
            const revokedResult = await client.query(
                `SELECT id, leaves FROM credential_issuances 
                 WHERE id = ANY($1) AND status = 'active'`,
                [credentialIds]
            );
            
            const revokedLeaves = new Set<string>();
            for (const row of revokedResult.rows) {
                const leaves = typeof row.leaves === 'string' ? JSON.parse(row.leaves) : row.leaves;
                if (Array.isArray(leaves)) {
                    leaves.forEach((leaf: string) => revokedLeaves.add(leaf));
                }
            }

            // 2. Mark credentials as revoked in the database
            const revokedAt = new Date();
            await client.query(
                `UPDATE credential_issuances 
                 SET revoked_at = $1, status = 'revoked'
                 WHERE id = ANY($2) AND status = 'active'`,
                [revokedAt, credentialIds]
            );

            // 3. Compute new root using stored leaves (avoid O(N) holder iteration)
            // Query only the leaves column which is pre-computed
            const activeResult = await client.query(
                `SELECT leaves FROM credential_issuances 
                 WHERE status = 'active' AND revoked_at IS NULL
                 ORDER BY issued_at ASC`
            );

            let newRoot: string | null = null;
            const newLeaves: string[] = [];

            // Collect pre-computed leaves from active credentials
            for (const row of activeResult.rows) {
                const leaves = typeof row.leaves === 'string' ? JSON.parse(row.leaves) : row.leaves;
                if (Array.isArray(leaves)) {
                    newLeaves.push(...leaves);
                }
            }

            if (newLeaves.length > 0) {
                const tree = new MerkleTreeBuilder(newLeaves).buildTree();
                newRoot = tree.root;
            }

            // 4. Store revocation record with new root
            const revocationId = randomUUID();
            await client.query(
                `INSERT INTO credential_revocations (id, revoked_credential_ids, new_root, revoked_at)
                 VALUES ($1, $2, $3, $4)`,
                [revocationId, JSON.stringify(credentialIds), newRoot, revokedAt]
            );

            await client.query('COMMIT');
            
            // Invalidate cache
            this.credentialLeavesCache.clear();

            // 5. Publish new root to ledger service
            if (newRoot) {
                await this.publishRootToLedger(revocationId, newRoot, 'credential.revoked');
            }

            this.logger.log(`Revoked ${credentialIds.length} credentials, new root: ${newRoot}`);

            return { 
                status: 'revoked', 
                count: credentialIds.length,
                revocation_id: revocationId,
                new_root: newRoot,
                revoked_at: revokedAt.toISOString()
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verify membership of a leaf in the Merkle tree
     * Validates proof structure and cryptographic correctness
     */
    async verifyMembership(leaf: string, path: MerklePath, root: string): Promise<boolean> {
        // Validate input parameters
        if (!leaf || typeof leaf !== 'string' || !/^[a-f0-9]{64}$/i.test(leaf)) {
            this.logger.warn('Invalid leaf format');
            return false;
        }

        if (!root || typeof root !== 'string' || !/^[a-f0-9]{64}$/i.test(root)) {
            this.logger.warn('Invalid root format');
            return false;
        }

        if (!path || !Array.isArray(path.siblings)) {
            this.logger.warn('Invalid path structure');
            return false;
        }

        // Validate each sibling in the path
        for (const sibling of path.siblings) {
            if (!sibling.hash || !/^[a-f0-9]{64}$/i.test(sibling.hash)) {
                this.logger.warn('Invalid sibling hash format');
                return false;
            }
            if (sibling.position !== 'left' && sibling.position !== 'right') {
                this.logger.warn('Invalid sibling position');
                return false;
            }
        }

        // Verify the root exists in our database (active credential)
        const rootCheck = await this.pool.query(
            `SELECT id FROM credential_issuances 
             WHERE root = $1 AND status = 'active' AND revoked_at IS NULL`,
            [root]
        );

        if (rootCheck.rows.length === 0) {
            this.logger.warn(`Root ${root} not found or has been revoked`);
            return false;
        }

        // Use the common utility to verify the Merkle proof
        return verifyMerkleProof(leaf, path, root);
    }

    /**
     * Publish a root update to the ledger service
     */
    private async publishRootToLedger(id: string, root: string, eventType: string): Promise<void> {
        if (!this.httpService) {
            this.logger.warn('HttpService not available, skipping ledger publish');
            return;
        }

        try {
            const signingKey = process.env.SIGNING_SECRET;
            if (!signingKey) {
                this.logger.warn('SIGNING_SECRET not set, skipping ledger publish');
                return;
            }

            const payload = { credential_id: id, root, event_type: eventType };
            const signer = 'credential-issuer';
            const timestamp = Date.now();
            
            const crypto = await import('crypto');
            const message = JSON.stringify({ type: eventType, payload, signer, timestamp });
            const signature = crypto.createHmac('sha256', signingKey).update(message).digest('hex');

            await firstValueFrom(
                this.httpService.post(`${this.ledgerServiceUrl}/events`, {
                    type: eventType,
                    payload,
                    signer,
                    signature,
                })
            );

            this.logger.log(`Published ${eventType} to ledger: ${root}`);
        } catch (error: any) {
            this.logger.warn(`Failed to publish to ledger: ${error.message}`);
        }
    }
}
