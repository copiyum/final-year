import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { MerkleTreeBuilder, canonicalHash } from '@zkp-ledger/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CredentialService {
    private readonly logger = new Logger(CredentialService.name);

    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async issueCredentials(holders: string[]) {
        this.logger.log(`Issuing credentials for ${holders.length} holders`);

        // 1. Create leaf values (hash of holder ID + secret/salt if needed, but for now just holder ID)
        // In a real system, we'd add a secret or claim data.
        const leaves = holders.map(h => canonicalHash({ holder: h }));

        // 2. Build Merkle Tree
        const tree = new MerkleTreeBuilder(leaves).buildTree();
        const root = tree.root;

        // 3. Store issuance record
        const issuanceId = randomUUID();
        await this.pool.query(
            `INSERT INTO credential_issuances (id, root, holders, leaves, issued_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [issuanceId, root, JSON.stringify(holders), JSON.stringify(leaves)]
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

        return {
            issuance_id: issuanceId,
            root,
            credentials
        };
    }

    async revokeCredentials(credentialIds: string[]) {
        this.logger.log(`Revoking credentials: ${credentialIds.join(', ')}`);

        // 1. Mark credentials as revoked in the database
        const revokedAt = new Date();
        await this.pool.query(
            `UPDATE credential_issuances 
             SET revoked_at = $1, status = 'revoked'
             WHERE id = ANY($2)`,
            [revokedAt, credentialIds]
        );

        // 2. Get remaining active holders to rebuild the tree
        const activeResult = await this.pool.query(
            `SELECT holders FROM credential_issuances 
             WHERE revoked_at IS NULL AND status != 'revoked'`
        );

        // 3. If there are active credentials, compute new root
        let newRoot = null;
        if (activeResult.rows.length > 0) {
            const allActiveHolders = activeResult.rows.flatMap(row => 
                typeof row.holders === 'string' ? JSON.parse(row.holders) : row.holders
            );
            
            if (allActiveHolders.length > 0) {
                const leaves = allActiveHolders.map((h: string) => canonicalHash({ holder: h }));
                const tree = new MerkleTreeBuilder(leaves).buildTree();
                newRoot = tree.root;
            }
        }

        return { 
            status: 'revoked', 
            count: credentialIds.length,
            newRoot,
            revokedAt: revokedAt.toISOString()
        };
    }

    async verifyMembership(leaf: string, path: any, root: string): Promise<boolean> {
        // Use the verifyMerkleProof utility from common package
        const { verifyMerkleProof } = await import('@zkp-ledger/common');
        return verifyMerkleProof(leaf, path, root);
    }
}
