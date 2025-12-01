import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { QueueService } from '@zkp-ledger/queue';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private queueService: QueueService,
    ) { }

    async createJob(dto: CreateJobDto) {
        // 1. Validate target exists (skip validation for verification_request type)
        if (dto.target_type !== 'verification_request') {
            const table = dto.target_type === 'event' ? 'events' : 'batches';
            const target = await this.pool.query(`SELECT id FROM ${table} WHERE id = $1`, [dto.target_id]);

            if (target.rows.length === 0) {
                throw new Error(`Target ${dto.target_type} with ID ${dto.target_id} not found`);
            }
        }

        // 2. Check for duplicate job
        const existing = await this.pool.query(
            'SELECT * FROM prover_jobs WHERE target_id = $1 AND circuit = $2 AND status NOT IN (\'failed\', \'cancelled\')',
            [dto.target_id, dto.circuit]
        );

        if (existing.rows.length > 0) {
            const existingJob = existing.rows[0];
            
            // If job is still pending, re-enqueue it (handles Redis restart/queue clear scenarios)
            if (existingJob.status === 'pending') {
                await this.queueService.addJob({
                    id: existingJob.id,
                    circuit_type: existingJob.circuit,
                    batch_id: existingJob.target_id,
                    input: existingJob.witness_data,
                    batch_root: existingJob.witness_data?.batchRoot,
                });
            }
            
            return existingJob;
        }

        // 3. Create job record
        const result = await this.pool.query(
            `INSERT INTO prover_jobs (
        target_type, target_id, circuit, witness_data, status, priority
      ) VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
            [dto.target_type, dto.target_id, dto.circuit, JSON.stringify(dto.witness_data), dto.priority || 0]
        );

        const job = result.rows[0];

        // 3. Enqueue job
        await this.queueService.addJob({
            id: job.id,
            circuit_type: dto.circuit,
            batch_id: job.target_id,
            target_type: dto.target_type,
            target_id: dto.target_id,
            input: dto.witness_data,
            batch_root: dto.witness_data?.batchRoot,
        });

        return job;
    }

    async getJob(id: string) {
        const result = await this.pool.query('SELECT * FROM prover_jobs WHERE id = $1', [id]);
        return result.rows[0];
    }

    async listJobs(limit = 10, offset = 0) {
        const result = await this.pool.query(
            'SELECT * FROM prover_jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return result.rows;
    }

    async requeuePendingJobs() {
        const result = await this.pool.query(
            'SELECT * FROM prover_jobs WHERE status = \'pending\' ORDER BY priority DESC, created_at ASC'
        );

        const jobs = result.rows;
        let requeued = 0;

        for (const job of jobs) {
            await this.queueService.addJob({
                id: job.id,
                circuit_type: job.circuit,
                batch_id: job.target_id,
                input: job.witness_data,
                batch_root: job.witness_data?.batchRoot,
            });
            requeued++;
        }

        return { requeued, total: jobs.length };
    }

    /**
     * Get jobs from the dead letter queue
     */
    async getDeadLetterJobs(limit: number = 10) {
        const dlqJobs = await this.queueService.getDeadLetterJobs(limit);
        return {
            jobs: dlqJobs,
            count: dlqJobs.length
        };
    }

    /**
     * Reprocess a specific job from the dead letter queue
     */
    async reprocessDeadLetterJob(dlqJobId: string) {
        const newJobId = await this.queueService.reprocessDeadLetterJob(dlqJobId);
        
        if (!newJobId) {
            throw new Error(`Job ${dlqJobId} not found in dead letter queue`);
        }

        return {
            success: true,
            original_dlq_id: dlqJobId,
            new_job_id: newJobId,
            message: 'Job requeued successfully'
        };
    }

    /**
     * Reprocess all jobs in the dead letter queue
     */
    async reprocessAllDeadLetterJobs() {
        const dlqJobs = await this.queueService.getDeadLetterJobs(100);
        const results = [];

        for (const job of dlqJobs) {
            try {
                const newJobId = await this.queueService.reprocessDeadLetterJob(job.id);
                results.push({ dlq_id: job.id, new_job_id: newJobId, success: true });
            } catch (error: any) {
                results.push({ dlq_id: job.id, success: false, error: error.message });
            }
        }

        return {
            processed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    /**
     * Get failed jobs from the database
     */
    async getFailedJobs(limit: number = 10) {
        const result = await this.pool.query(
            `SELECT * FROM prover_jobs 
             WHERE status = 'failed' 
             ORDER BY created_at DESC 
             LIMIT $1`,
            [limit]
        );

        return {
            jobs: result.rows,
            count: result.rows.length
        };
    }

    /**
     * Retry a failed job by resetting its status and re-enqueueing
     */
    async retryFailedJob(jobId: string) {
        // Get the failed job
        const result = await this.pool.query(
            `SELECT * FROM prover_jobs WHERE id = $1 AND status = 'failed'`,
            [jobId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Failed job ${jobId} not found`);
        }

        const job = result.rows[0];

        // Reset job status to pending
        await this.pool.query(
            `UPDATE prover_jobs 
             SET status = 'pending', error_message = NULL, retry_count = COALESCE(retry_count, 0) + 1
             WHERE id = $1`,
            [jobId]
        );

        // Re-enqueue the job
        await this.queueService.addJob({
            id: job.id,
            circuit_type: job.circuit,
            batch_id: job.target_id,
            input: job.witness_data,
            batch_root: job.witness_data?.batchRoot,
        });

        return {
            success: true,
            job_id: jobId,
            message: 'Job requeued successfully'
        };
    }
}
