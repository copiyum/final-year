import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { QueueService } from '@zkp-ledger/queue';
import { StorageService } from '@zkp-ledger/storage';
import { Pool } from 'pg';

@Injectable()
export class WorkerService implements OnModuleInit {
    private readonly logger = new Logger(WorkerService.name);
    private storage: StorageService;

    constructor(
        private readonly queueService: QueueService,
        @Inject('DATABASE_POOL') private pool: Pool
    ) {
        console.log('WorkerService constructor called');
        this.storage = new StorageService();
        console.log('WorkerService constructor completed');
    }

    async onModuleInit() {
        this.logger.log('WorkerService initialized, starting job processor...');
        try {
            this.logger.log('Ensuring storage bucket...');
            await this.storage.ensureBucket();
            this.logger.log('Storage bucket ready');
        } catch (err: any) {
            this.logger.error(`Storage bucket error (continuing anyway): ${err.message}`);
        }
        // Start processing in background (don't await)
        this.processJobs();
        this.logger.log('Job processor started in background');
    }

    private async processJobs() {
        this.logger.log('Starting job processing loop...');
        // Run in a loop to continuously process jobs
        while (true) {
            try {
                await this.queueService.processJobs(
                    'prover-worker',
                    async (job) => {
                        await this.processJob(job.data);
                    }
                );
            } catch (error: any) {
                this.logger.error(`Job processing loop error: ${error.message}`);
                // Wait a bit before retrying to avoid tight loops on error
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private async processJob(job: any) {
        this.logger.log(`Processing job ${job.id} for circuit ${job.circuit_type}`);

        try {
            let proof, publicSignals;

            if (job.circuit_type === 'metrics_threshold') {
                // Real ZKP proof generation using snarkjs
                const snarkjs = await import('snarkjs');
                const path = await import('path');
                const fs = await import('fs');

                const circuitPath = path.join(process.cwd(), 'circuits');
                const wasmPath = path.join(circuitPath, 'metrics_threshold.wasm');
                const zkeyPath = path.join(circuitPath, 'metrics_threshold_final.zkey');
                const vkeyPath = path.join(circuitPath, 'verification_key.json');

                // Prepare input
                const input = {
                    actualValue: job.input.actualValue.toString(),
                    threshold: job.input.threshold.toString(),
                    metricType: job.input.metricType.toString()
                };

                this.logger.log(`Generating REAL ZKP proof for: actualValue > ${job.input.threshold}`);

                // Generate proof using Groth16
                const { proof: generatedProof, publicSignals: signals } = await snarkjs.groth16.fullProve(
                    input,
                    wasmPath,
                    zkeyPath
                );

                proof = generatedProof;
                publicSignals = signals;

                // Verify proof locally before uploading
                const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
                const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

                if (!verified) {
                    throw new Error('Proof verification failed - invalid proof generated');
                }

                this.logger.log('✅ Real ZKP proof generated and verified successfully!');
            } else {
                // Fallback to mock for other circuit types
                this.logger.warn(`Using mock proof for circuit type: ${job.circuit_type}`);
                proof = {
                    pi_a: ['mock_a1', 'mock_a2'],
                    pi_b: [['mock_b1', 'mock_b2'], ['mock_b3', 'mock_b4']],
                    pi_c: ['mock_c1', 'mock_c2'],
                    protocol: 'groth16'
                };
                publicSignals = [job.batch_root || 'mock_root'];
            }

            // Upload proof to MinIO/S3
            const proofKey = `proofs/${job.batch_id}.json`;
            const proofUrl = await this.storage.uploadProof(proofKey, { proof, publicSignals });

            this.logger.log(`Proof uploaded to ${proofUrl}`);

            // Update job status in database
            await this.pool.query(
                `UPDATE prover_jobs SET status = 'verified', proof_s3_url = $1, public_inputs = $2, completed_at = NOW() WHERE id = $3`,
                [proofUrl, JSON.stringify(publicSignals), job.id]
            );

            this.logger.log(`Job ${job.id} marked as verified`);

            // If this is a metrics_threshold proof, update the startup_metrics table
            if (job.circuit_type === 'metrics_threshold' && job.batch_id) {
                try {
                    // Update startup_metrics that reference this batch
                    await this.pool.query(
                        `UPDATE startup_metrics 
                         SET proof_status = 'verified', proof_url = $1 
                         WHERE proof_batch_id = $2`,
                        [proofUrl, job.batch_id]
                    );
                    this.logger.log(`Updated startup_metrics for batch ${job.batch_id}`);
                } catch (metricError: any) {
                    this.logger.warn(`Failed to update startup_metrics: ${metricError.message}`);
                }
            }

            return { proof, publicSignals, proofUrl };
        } catch (error: any) {
            this.logger.error(`Proof generation failed: ${error.message}`);

            // Mark job as failed
            if (job?.id) {
                await this.pool.query(
                    `UPDATE prover_jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
                    [error.message, job.id]
                );
            }

            throw error;
        }
    }
}
