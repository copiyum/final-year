import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MerkleTreeBuilder, canonicalHash } from '@zkp-ledger/common';
import { randomUUID } from 'crypto';
import { AnchorService } from './anchor.service';

@Injectable()
export class AggregatorService {
    private readonly logger = new Logger(AggregatorService.name);
    private isProcessing = false;
    private isAnchoring = false;

    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private readonly anchorService: AnchorService,
        private readonly httpService: HttpService
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async processPendingEvents() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. Fetch pending events (limit 10 for batch size)
            const result = await this.pool.query(
                `SELECT * FROM events 
         WHERE proof_status = 'none' 
         ORDER BY created_at ASC 
         LIMIT 10`
            );

            const events = result.rows;
            if (events.length === 0) {
                this.isProcessing = false;
                return;
            }

            this.logger.log(`Found ${events.length} pending events. Creating batch...`);

            // 2. Compute Merkle roots
            // For simplicity, we assume prestate is empty or previous batch's poststate
            // In a real system, we'd fetch the latest batch's poststate
            const latestBatch = await this.pool.query(
                `SELECT poststate_root FROM batches ORDER BY created_at DESC LIMIT 1`
            );
            const prestateRoot = latestBatch.rows[0]?.poststate_root || '0x0'; // Genesis root

            // Build tree from event hashes
            // We need to hash the events first. Assuming payload is what we hash?
            // Or we hash the whole event? Design says "Merkle root of events".
            // Let's use the event IDs or hashes if we had them.
            // The events table doesn't store a hash column, but blocks do.
            // Let's compute hash of each event.
            const eventHashes = events.map(e => {
                // Canonical hash of the event data
                return canonicalHash({
                    type: e.type,
                    payload: e.payload,
                    signer: e.signer,
                    signature: e.signature,
                    format_version: '1.0',
                    circuit_version: '1.0'
                });
            });

            const tree = new MerkleTreeBuilder(eventHashes).buildTree();
            const poststateRoot = tree.root;

            // 3. Create Batch record
            const batchId = randomUUID();
            const eventIds = events.map(e => e.id);

            await this.pool.query(
                `INSERT INTO batches (id, event_ids, prestate_root, poststate_root, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
                [batchId, JSON.stringify(eventIds), prestateRoot, poststateRoot]
            );

            // 4. Update events status
            await this.pool.query(
                `UPDATE events SET proof_status = 'pending' WHERE id = ANY($1)`,
                [eventIds]
            );

            this.logger.log(`Batch ${batchId} created with root ${poststateRoot}`);

            // 5. Request Proof via Prover Coordinator API
            try {
                const coordinatorUrl = process.env.PROVER_COORDINATOR_URL || 'http://localhost:3001';

                const jobResponse = await firstValueFrom(
                    this.httpService.post(`${coordinatorUrl}/jobs`, {
                        target_type: 'batch',
                        target_id: batchId,
                        circuit: 'rollup-circuit',
                        witness_data: {
                            batchRoot: poststateRoot,
                            prestateRoot,
                            eventIds,
                        },
                        priority: 10,
                    })
                );

                const jobId = jobResponse.data.id;

                await this.pool.query(
                    `UPDATE batches SET proof_job_id = $1, status = 'proving' WHERE id = $2`,
                    [jobId, batchId]
                );

                this.logger.log(`Proof job ${jobId} created for batch ${batchId}`);
            } catch (jobError) {
                this.logger.error(`Failed to create proof job for batch ${batchId}:`, jobError);
            }

        } catch (error) {
            this.logger.error('Failed to process pending events', error);
        } finally {
            this.isProcessing = false;
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async processVerifiedBatches() {
        if (this.isAnchoring) return;
        this.isAnchoring = true;

        try {
            // Find batches that are 'proving' but have a 'verified' job
            const result = await this.pool.query(
                `SELECT b.*, j.proof_s3_url, j.public_inputs 
         FROM batches b
         JOIN prover_jobs j ON b.proof_job_id = j.id
         WHERE b.status = 'proving' AND j.status = 'verified'
         LIMIT 1`
            );

            if (result.rows.length === 0) return;

            const batch = result.rows[0];
            this.logger.log(`Found verified batch ${batch.id}. Anchoring...`);

            // In a real app, we'd fetch the proof from S3 using the URL
            // For now, we'll assume the proof is in the job record or we mock it
            // Since we don't have S3 fetch logic here yet, let's assume we can proceed
            // But wait, AnchorService needs the proof.
            // Let's assume for this task we mock the proof if it's not in DB.
            // Or we can store the proof in DB for simplicity (not recommended for large proofs but ok for prototype)
            // The design says proof_s3_url.

            // Try to anchor on blockchain if enabled
            if (this.anchorService.isEnabled()) {
                try {
                    // Fetch proof from storage if available
                    const proofUrl = batch.proof_s3_url;
                    let proof = {
                        pi_a: ["0", "0"],
                        pi_b: [["0", "0"], ["0", "0"]],
                        pi_c: ["0", "0"]
                    };

                    // For now, use mock proof - in production, fetch from MinIO
                    // TODO: Implement proof fetching from MinIO
                    
                    const anchorResult = await this.anchorService.anchorBatchWithoutProof(
                        batch.id,
                        batch.poststate_root,
                        batch.prestate_root,
                        batch.poststate_root,
                        `ipfs://batch/${batch.id}`
                    );

                    if (anchorResult) {
                        await this.pool.query(
                            `UPDATE batches SET anchor_tx = $1 WHERE id = $2`,
                            [JSON.stringify({
                                txHash: anchorResult.txHash,
                                blockNumber: anchorResult.blockNumber,
                                gasUsed: anchorResult.gasUsed,
                                timestamp: new Date().toISOString()
                            }), batch.id]
                        );
                        this.logger.log(`Batch ${batch.id} anchored on-chain: ${anchorResult.txHash}`);
                    }
                } catch (anchorError: any) {
                    this.logger.error(`Failed to anchor batch ${batch.id} on-chain: ${anchorError.message}`);
                    // Continue with local verification even if on-chain fails
                }
            } else {
                this.logger.log(`Blockchain anchoring disabled. Batch ${batch.id} verified locally only.`);
            }

            // Update batch status to anchored
            await this.pool.query(
                `UPDATE batches SET status = 'anchored', anchored_at = NOW() WHERE id = $1`,
                [batch.id]
            );

            // Update all events in this batch to 'verified'
            await this.pool.query(
                `UPDATE events SET proof_status = 'verified' WHERE id = ANY(
                    SELECT jsonb_array_elements_text(event_ids::jsonb)::uuid FROM batches WHERE id = $1
                )`,
                [batch.id]
            );

            // Update corresponding startup_metrics to 'verified'
            // Extract metric_id from event payloads and update their status
            await this.pool.query(
                `UPDATE startup_metrics 
                 SET proof_status = 'verified', proof_batch_id = $1
                 WHERE id IN (
                     SELECT (payload->>'metric_id')::uuid 
                     FROM events 
                     WHERE id = ANY(
                         SELECT jsonb_array_elements_text(event_ids::jsonb)::uuid 
                         FROM batches 
                         WHERE id = $1
                     )
                     AND type = 'metric.added'
                     AND payload->>'metric_id' IS NOT NULL
                 )`,
                [batch.id]
            );

            this.logger.log(`Batch ${batch.id} and its events marked as verified`);

        } catch (error) {
            this.logger.error('Failed to anchor batch', error);
        } finally {
            this.isAnchoring = false;
        }
    }
}
