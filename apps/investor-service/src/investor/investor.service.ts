import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InvestorService {
    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private httpService: HttpService,
    ) { }

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

        // TODO: Hash investor.interest event to Ledger
        // TODO: Notify startup founder

        return result.rows[0];
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

        // TODO: Hash investor.commitment event to Ledger
        // TODO: Wait for batch proof generation
        // TODO: Link to proof_batch_id

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

        // TODO: Get Merkle inclusion proof from Ledger Service
        // For now, return basic info
        return {
            status: 'pending_batch',
            commitment_id: commitment.id,
            event_id: commitment.event_id,
            proof_batch_id: commitment.proof_batch_id
        };
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

        // TODO: Hash access.requested event to Ledger
        // TODO: Notify startup founder

        return {
            message: 'Access request sent',
            request: result.rows[0]
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
