import { Injectable, NotFoundException, ConflictException, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class InvestorService {
    private readonly logger = new Logger(InvestorService.name);
    private readonly ledgerServiceUrl: string;
    private readonly proverCoordinatorUrl: string;

    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private httpService: HttpService,
    ) {
        this.ledgerServiceUrl = process.env.LEDGER_SERVICE_URL || 'http://localhost:3000';
        this.proverCoordinatorUrl = process.env.PROVER_COORDINATOR_URL || 'http://localhost:3001';
    }

    /**
     * Generate a cryptographic signature for an event
     */
    private generateSignature(type: string, payload: any, signer: string): string {
        const signingKey = process.env.SIGNING_SECRET;
        if (!signingKey) {
            throw new Error('SIGNING_SECRET environment variable is required');
        }
        const message = JSON.stringify({ type, payload, signer, timestamp: Date.now() });
        return crypto.createHmac('sha256', signingKey).update(message).digest('hex');
    }

    /**
     * Hash an event to the ledger service
     */
    private async hashEventToLedger(type: string, payload: any, signer: string): Promise<string | null> {
        try {
            const signature = this.generateSignature(type, payload, signer);
            const response = await firstValueFrom(
                this.httpService.post(`${this.ledgerServiceUrl}/events`, {
                    type,
                    payload,
                    signer,
                    signature,
                })
            );
            this.logger.log(`Event ${type} hashed to ledger: ${response.data.id}`);
            return response.data.id;
        } catch (error: any) {
            this.logger.warn(`Failed to hash event to ledger: ${error.message}`);
            return null;
        }
    }

    /**
     * Notify startup founder about an investor action
     */
    private async notifyFounder(startupId: string, notificationType: string, data: any): Promise<void> {
        try {
            // Get founder info
            const founderResult = await this.pool.query(
                `SELECT u.id, u.email FROM startups s 
                 JOIN users u ON s.founder_id = u.id 
                 WHERE s.id = $1`,
                [startupId]
            );
            
            if (founderResult.rows.length > 0) {
                const founder = founderResult.rows[0];
                // Store notification in database
                await this.pool.query(
                    `INSERT INTO notifications (user_id, type, data, created_at)
                     VALUES ($1, $2, $3, NOW())`,
                    [founder.id, notificationType, JSON.stringify(data)]
                );
                this.logger.log(`Notification sent to founder ${founder.id}: ${notificationType}`);
            }
        } catch (error: any) {
            this.logger.warn(`Failed to notify founder: ${error.message}`);
        }
    }

    async expressInterest(investorId: string, startupId: string) {
        // Check if startup exists
        const startupCheck = await this.pool.query(
            'SELECT id FROM startups WHERE id = $1',
            [startupId]
        );

        if (startupCheck.rows.length === 0) {
            throw new NotFoundException('Startup not found');
        }

        // Create or update interest
        const result = await this.pool.query(
            `INSERT INTO interests (investor_id, startup_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (investor_id, startup_id)
       DO UPDATE SET status = 'active'
       RETURNING *`,
            [investorId, startupId]
        );

        const interest = result.rows[0];

        // Hash investor.interest event to Ledger
        this.hashEventToLedger(
            'investor.interest',
            { investor_id: investorId, startup_id: startupId, interest_id: interest.id },
            investorId
        );

        // Notify startup founder
        this.notifyFounder(startupId, 'investor.interest', {
            investor_id: investorId,
            startup_id: startupId,
            message: 'An investor has expressed interest in your startup'
        });

        return interest;
    }

    async getMyInterests(investorId: string) {
        const result = await this.pool.query(
            `SELECT i.*, s.name as startup_name, s.description, s.sector
       FROM interests i
       JOIN startups s ON i.startup_id = s.id
       WHERE i.investor_id = $1
       ORDER BY i.created_at DESC`,
            [investorId]
        );

        return result.rows;
    }

    async makeCommitment(investorId: string, startupId: string, amount: number, terms?: string) {
        // Check if startup exists
        const startupCheck = await this.pool.query(
            'SELECT id FROM startups WHERE id = $1',
            [startupId]
        );

        if (startupCheck.rows.length === 0) {
            throw new NotFoundException('Startup not found');
        }

        // Create commitment
        const result = await this.pool.query(
            `INSERT INTO commitments (investor_id, startup_id, amount, terms, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
            [investorId, startupId, amount, terms]
        );

        const commitment = result.rows[0];

        // Hash investor.commitment event to Ledger
        const eventId = await this.hashEventToLedger(
            'investor.commitment',
            { 
                investor_id: investorId, 
                startup_id: startupId, 
                commitment_id: commitment.id,
                amount 
            },
            investorId
        );

        // Update commitment with event reference
        if (eventId) {
            await this.pool.query(
                `UPDATE commitments SET event_id = $1 WHERE id = $2`,
                [eventId, commitment.id]
            );
        }

        // Request batch proof generation via Prover Coordinator
        try {
            const jobResponse = await firstValueFrom(
                this.httpService.post(`${this.proverCoordinatorUrl}/jobs`, {
                    target_type: 'commitment',
                    target_id: commitment.id,
                    circuit: 'commitment-circuit',
                    witness_data: {
                        commitmentId: commitment.id,
                        investorId,
                        startupId,
                        amount,
                    },
                    priority: 5,
                })
            );

            const jobId = jobResponse.data.id;
            
            // Link to proof_batch_id
            await this.pool.query(
                `UPDATE commitments SET proof_batch_id = $1 WHERE id = $2`,
                [jobId, commitment.id]
            );

            this.logger.log(`Proof job ${jobId} created for commitment ${commitment.id}`);
        } catch (proofError: any) {
            this.logger.warn(`Failed to request proof for commitment: ${proofError.message}`);
        }

        return commitment;
    }

    async getMyCommitments(investorId: string) {
        const result = await this.pool.query(
            `SELECT c.*, s.name as startup_name, s.sector
       FROM commitments c
       JOIN startups s ON c.startup_id = s.id
       WHERE c.investor_id = $1
       ORDER BY c.created_at DESC`,
            [investorId]
        );

        return result.rows;
    }

    async getCommitmentProof(commitmentId: string, investorId: string) {
        // Get commitment
        const result = await this.pool.query(
            `SELECT * FROM commitments WHERE id = $1 AND investor_id = $2`,
            [commitmentId, investorId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Commitment not found');
        }

        const commitment = result.rows[0];

        if (!commitment.event_id) {
            return {
                status: 'no_event',
                message: 'Commitment not yet hashed to ledger'
            };
        }

        // Get Merkle inclusion proof from Ledger Service
        try {
            const proofResponse = await firstValueFrom(
                this.httpService.get(`${this.ledgerServiceUrl}/events/${commitment.event_id}/proof`)
            );
            
            const proofData = proofResponse.data;
            
            // If proof is included, verify it client-side
            if (proofData.status === 'included' && proofData.merkle_path && proofData.batch_root) {
                const isValid = await this.verifyMerkleProofClientSide(
                    commitment.event_id,
                    proofData.merkle_path,
                    proofData.batch_root
                );

                return {
                    status: proofData.status,
                    commitment_id: commitment.id,
                    event_id: commitment.event_id,
                    proof_batch_id: commitment.proof_batch_id,
                    merkle_proof: proofData.merkle_path,
                    batch_root: proofData.batch_root,
                    batch_id: proofData.batch_id,
                    verified_client_side: isValid,
                    verification_timestamp: new Date().toISOString()
                };
            }
            
            return {
                status: proofData.status,
                commitment_id: commitment.id,
                event_id: commitment.event_id,
                proof_batch_id: commitment.proof_batch_id,
                merkle_proof: proofData.merkle_path,
                batch_root: proofData.batch_root
            };
        } catch (error: any) {
            this.logger.warn(`Failed to get inclusion proof: ${error.message}`);
            return {
                status: 'pending_batch',
                commitment_id: commitment.id,
                event_id: commitment.event_id,
                proof_batch_id: commitment.proof_batch_id
            };
        }
    }

    /**
     * Verify a Merkle proof client-side
     * This provides an additional layer of verification beyond trusting the ledger service
     */
    private async verifyMerkleProofClientSide(
        eventId: string,
        merklePath: any,
        expectedRoot: string
    ): Promise<boolean> {
        try {
            // Get the event data to compute its hash
            const eventResponse = await firstValueFrom(
                this.httpService.get(`${this.ledgerServiceUrl}/events/${eventId}`)
            );
            
            const event = eventResponse.data;
            if (!event) {
                this.logger.warn(`Event ${eventId} not found for verification`);
                return false;
            }

            // Import verification utilities
            const { canonicalHash, verifyMerkleProof } = await import('@zkp-ledger/common');

            // Compute the leaf hash (same as ledger service does)
            const leafHash = canonicalHash({
                type: event.type,
                payload: event.payload,
                signer: event.signer,
                signature: event.signature,
                format_version: '1.0',
                circuit_version: '1.0'
            });

            // Verify the Merkle proof
            const isValid = verifyMerkleProof(leafHash, merklePath, expectedRoot);
            
            if (!isValid) {
                this.logger.warn(`Merkle proof verification failed for event ${eventId}`);
            }

            return isValid;
        } catch (error: any) {
            this.logger.error(`Client-side proof verification error: ${error.message}`);
            return false;
        }
    }

    async requestAccess(investorId: string, startupId: string) {
        // Check if startup exists
        const startupCheck = await this.pool.query(
            'SELECT id, founder_id FROM startups WHERE id = $1',
            [startupId]
        );

        if (startupCheck.rows.length === 0) {
            throw new NotFoundException('Startup not found');
        }

        // Check if access already exists
        const accessCheck = await this.pool.query(
            `SELECT * FROM access_permissions 
       WHERE startup_id = $1 AND investor_id = $2`,
            [startupId, investorId]
        );

        if (accessCheck.rows.length > 0 && accessCheck.rows[0].granted_at) {
            throw new ConflictException('Access already granted');
        }

        // Create access request (or update existing)
        const result = await this.pool.query(
            `INSERT INTO access_permissions (startup_id, investor_id, access_level)
       VALUES ($1, $2, 'basic')
       ON CONFLICT (startup_id, investor_id)
       DO UPDATE SET access_level = 'basic'
       RETURNING *`,
            [startupId, investorId]
        );

        const accessRequest = result.rows[0];

        // Hash access.requested event to Ledger
        this.hashEventToLedger(
            'access.requested',
            { investor_id: investorId, startup_id: startupId, request_id: accessRequest.id },
            investorId
        );

        // Notify startup founder
        this.notifyFounder(startupId, 'access.requested', {
            investor_id: investorId,
            startup_id: startupId,
            message: 'An investor has requested access to your startup data'
        });

        return {
            message: 'Access request sent',
            request: accessRequest
        };
    }

    async getAccessibleStartups(investorId: string) {
        // Return ALL startups for browsing, with access status for each
        const result = await this.pool.query(
            `SELECT s.*, 
                    ap.access_level,
                    ap.granted_at,
                    CASE 
                        WHEN ap.granted_at IS NOT NULL AND ap.revoked_at IS NULL THEN 'granted'
                        WHEN ap.investor_id IS NOT NULL AND ap.granted_at IS NULL THEN 'pending'
                        ELSE 'none'
                    END as access_status
             FROM startups s
             LEFT JOIN access_permissions ap ON s.id = ap.startup_id AND ap.investor_id = $1
             ORDER BY s.created_at DESC`,
            [investorId]
        );

        return result.rows;
    }

    async getMyAccessRequests(investorId: string) {
        const result = await this.pool.query(
            `SELECT ap.*, s.name as startup_name, s.sector
             FROM access_permissions ap
             JOIN startups s ON ap.startup_id = s.id
             WHERE ap.investor_id = $1
             ORDER BY s.created_at DESC`,
            [investorId]
        );

        return result.rows;
    }
}
