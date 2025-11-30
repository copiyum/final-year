import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class BatchesService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async getBatchById(id: string) {
        // Get batch details
        const batchResult = await this.pool.query(
            `SELECT id, poststate_root as batch_root, event_ids, status, created_at, anchored_at 
             FROM batches 
             WHERE id = $1`,
            [id]
        );

        if (batchResult.rows.length === 0) {
            return null;
        }

        const batch = batchResult.rows[0];

        // Get proof details if available
        const proofResult = await this.pool.query(
            `SELECT id, proof_s3_url, public_inputs, status, created_at, completed_at
             FROM prover_jobs
             WHERE target_type = 'batch' AND target_id = $1
             LIMIT 1`,
            [id]
        );

        const proof = proofResult.rows.length > 0 ? proofResult.rows[0] : null;

        // Get events in this batch
        const eventIds = batch.event_ids;
        let events = [];

        if (eventIds && eventIds.length > 0) {
            const eventsResult = await this.pool.query(
                `SELECT id, type, payload, signer, proof_status, created_at
                 FROM events
                 WHERE id = ANY($1::uuid[])
                 ORDER BY created_at ASC`,
                [eventIds]
            );
            events = eventsResult.rows;
        }

        return {
            ...batch,
            proof,
            events,
            event_count: events.length,
        };
    }
}
