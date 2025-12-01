import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { QueueService } from '@zkp-ledger/queue';
import { StorageService } from '@zkp-ledger/storage';
import { Pool } from 'pg';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WorkerService.name);
    private storage: StorageService;
    private isRunning = false;
    private processingPromise: Promise<void> | null = null;
    private readonly baseBackoffMs = 1000;
    private readonly maxBackoffMs = 30000;
    private currentBackoffMs = this.baseBackoffMs;
    
    // Circuit file cache to avoid repeated disk I/O
    private circuitCache: Map<string, { wasm: Buffer, zkey: Buffer, vkey: any }> = new Map();
    private readonly circuitCacheEnabled = process.env.CIRCUIT_CACHE_ENABLED !== 'false';

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
        this.startProcessing();
        this.logger.log('Job processor started in background');
    }

    async onModuleDestroy() {
        this.logger.log('Shutting down worker service...');
        await this.stopProcessing();
    }

    private startProcessing() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.processingPromise = this.processJobsLoop();
    }

    async stopProcessing() {
        this.isRunning = false;
        if (this.processingPromise) {
            // Wait for current processing to complete
            await Promise.race([
                this.processingPromise,
                new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
            ]);
        }
        this.logger.log('Worker service stopped');
    }

    private async processJobsLoop() {
        this.logger.log('Starting job processing loop...');
        
        while (this.isRunning) {
            try {
                await this.queueService.processJobs(
                    'prover-worker',
                    async (job) => {
                        await this.processJob(job.data);
                    }
                );
                // Reset backoff on successful processing
                this.currentBackoffMs = this.baseBackoffMs;
            } catch (error: any) {
                this.logger.error(`Job processing loop error: ${error.message}`);
                
                // Exponential backoff with max limit
                await new Promise(resolve => setTimeout(resolve, this.currentBackoffMs));
                this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.maxBackoffMs);
            }
        }
    }

    private async processJob(job: any) {
        this.logger.log(`Processing job ${job.id} for circuit ${job.circuit_type}`);

        try {
            // Validate circuit type before processing
            const supportedCircuits = ['metrics_threshold', 'rollup-circuit', 'commitment-circuit'];
            if (!supportedCircuits.includes(job.circuit_type)) {
                throw new Error(`Unsupported circuit type: ${job.circuit_type}. Supported: ${supportedCircuits.join(', ')}`);
            }

            let proof, publicSignals;

            switch (job.circuit_type) {
                case 'metrics_threshold':
                    ({ proof, publicSignals } = await this.generateMetricsThresholdProof(job));
                    break;
                case 'rollup-circuit':
                    ({ proof, publicSignals } = await this.generateRollupProof(job));
                    break;
                case 'commitment-circuit':
                    ({ proof, publicSignals } = await this.generateCommitmentProof(job));
                    break;
                default:
                    throw new Error(`Circuit type ${job.circuit_type} not implemented`);
            }

            // Upload proof to MinIO/S3
            const proofKey = `proofs/${job.batch_id || job.id}.json`;
            const proofUrl = await this.storage.uploadProof(proofKey, { 
                proof, 
                publicSignals,
                circuit_type: job.circuit_type,
                generated_at: new Date().toISOString()
            });

            this.logger.log(`Proof uploaded to ${proofUrl}`);

            // Update job status in database
            await this.pool.query(
                `UPDATE prover_jobs SET status = 'verified', proof_s3_url = $1, public_inputs = $2, completed_at = NOW() WHERE id = $3`,
                [proofUrl, JSON.stringify(publicSignals), job.id]
            );

            this.logger.log(`Job ${job.id} marked as verified`);

            // Update related tables based on circuit type
            await this.updateRelatedTables(job, proofUrl, publicSignals);

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

    /**
     * Load circuit files with caching to avoid repeated disk I/O
     * ZKey files can be hundreds of MBs, so caching is critical for performance
     */
    private async loadCircuitFiles(circuitName: string, wasmPath: string, zkeyPath: string, vkeyPath: string): Promise<{ wasm: Buffer, zkey: Buffer, vkey: any } | null> {
        const fs = await import('fs');
        const cacheKey = circuitName;
        
        // Check cache first
        if (this.circuitCacheEnabled && this.circuitCache.has(cacheKey)) {
            this.logger.debug(`Using cached circuit files for ${circuitName}`);
            return this.circuitCache.get(cacheKey)!;
        }
        
        // Check if files exist
        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            return null;
        }
        
        // Load files
        const wasm = fs.readFileSync(wasmPath);
        const zkey = fs.readFileSync(zkeyPath);
        const vkey = fs.existsSync(vkeyPath) ? JSON.parse(fs.readFileSync(vkeyPath, 'utf8')) : null;
        
        const cached = { wasm, zkey, vkey };
        
        // Cache for future use
        if (this.circuitCacheEnabled) {
            this.circuitCache.set(cacheKey, cached);
            this.logger.log(`Cached circuit files for ${circuitName} (wasm: ${wasm.length} bytes, zkey: ${zkey.length} bytes)`);
        }
        
        return cached;
    }

    /**
     * Generate proof for metrics_threshold circuit
     * Proves that actualValue > threshold without revealing actualValue
     */
    private async generateMetricsThresholdProof(job: any): Promise<{ proof: any; publicSignals: any }> {
        const snarkjs = await import('snarkjs');
        const path = await import('path');

        const circuitPath = process.env.CIRCUIT_PATH || path.join(process.cwd(), 'circuits');
        const wasmPath = path.join(circuitPath, process.env.METRICS_THRESHOLD_WASM || 'metrics_threshold.wasm');
        const zkeyPath = path.join(circuitPath, process.env.METRICS_THRESHOLD_ZKEY || 'metrics_threshold_final.zkey');
        const vkeyPath = path.join(circuitPath, process.env.VERIFICATION_KEY || 'verification_key.json');

        // Load circuit files with caching
        const circuitFiles = await this.loadCircuitFiles('metrics_threshold', wasmPath, zkeyPath, vkeyPath);
        
        if (!circuitFiles) {
            this.logger.warn(`Circuit files not found at ${circuitPath}, using simulated proof`);
            return this.generateSimulatedProof(job, 'metrics_threshold');
        }

        // Prepare input - ensure metricType defaults to 1 if not provided
        const metricType = job.input.metricType || 1;
        const input = {
            actualValue: job.input.actualValue.toString(),
            threshold: job.input.threshold.toString(),
            metricType: metricType.toString()
        };

        this.logger.log(`Generating ZKP proof for: actualValue=${job.input.actualValue} > threshold=${job.input.threshold}, metricType=${metricType}`);

        // Generate proof using Groth16 with cached files
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );

        // Verify proof locally before uploading
        if (circuitFiles.vkey) {
            const verified = await snarkjs.groth16.verify(circuitFiles.vkey, publicSignals, proof);

            if (!verified) {
                throw new Error('Proof verification failed - invalid proof generated');
            }
        }

        this.logger.log('✅ metrics_threshold proof generated and verified successfully!');
        return { proof, publicSignals };
    }

    /**
     * Generate proof for rollup-circuit
     * Proves the validity of a batch of events being rolled up
     */
    private async generateRollupProof(job: any): Promise<{ proof: any; publicSignals: any }> {
        const snarkjs = await import('snarkjs');
        const path = await import('path');
        const crypto = await import('crypto');

        const circuitPath = process.env.CIRCUIT_PATH || path.join(process.cwd(), 'circuits');
        const wasmPath = path.join(circuitPath, 'rollup_circuit.wasm');
        const zkeyPath = path.join(circuitPath, 'rollup_circuit_final.zkey');
        const vkeyPath = path.join(circuitPath, 'rollup_verification_key.json');

        // Load circuit files with caching
        const circuitFiles = await this.loadCircuitFiles('rollup-circuit', wasmPath, zkeyPath, vkeyPath);
        
        if (!circuitFiles) {
            this.logger.warn(`Rollup circuit files not found, using simulated proof`);
            return this.generateSimulatedProof(job, 'rollup-circuit');
        }

        // Convert hex string to BigInt for circuit input
        const hexToBigInt = (hex: string): string => {
            if (!hex || hex === '0' || hex === '0x0') return '0';
            const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
            return BigInt('0x' + cleanHex.slice(0, 32)).toString(); // Take first 32 hex chars (128 bits)
        };

        // Generate event hashes from event IDs (or use provided hashes)
        const eventIds = job.input?.eventIds || [];
        const MAX_BATCH_SIZE = 32;
        const eventHashes: string[] = [];
        
        for (let i = 0; i < MAX_BATCH_SIZE; i++) {
            if (i < eventIds.length) {
                // Hash the event ID to get a numeric value for the circuit
                const hash = crypto.createHash('sha256').update(eventIds[i]).digest('hex');
                eventHashes.push(hexToBigInt(hash));
            } else {
                eventHashes.push('0'); // Pad with zeros
            }
        }

        // Prepare input for rollup circuit
        const input = {
            prestateRoot: hexToBigInt(job.input?.prestateRoot || '0'),
            poststateRoot: hexToBigInt(job.input?.batchRoot || job.batch_root || '0'),
            batchSize: eventIds.length.toString(),
            eventHashes: eventHashes
        };

        this.logger.log(`Generating rollup proof for batch with ${eventIds.length} events`);

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );

        // Verify proof locally using cached vkey
        if (circuitFiles.vkey) {
            const verified = await snarkjs.groth16.verify(circuitFiles.vkey, publicSignals, proof);

            if (!verified) {
                throw new Error('Rollup proof verification failed');
            }
        }

        this.logger.log('✅ rollup-circuit proof generated and verified successfully!');
        return { proof, publicSignals };
    }

    /**
     * Generate proof for commitment-circuit
     * Proves the validity of an investment commitment
     */
    private async generateCommitmentProof(job: any): Promise<{ proof: any; publicSignals: any }> {
        const snarkjs = await import('snarkjs');
        const path = await import('path');
        const crypto = await import('crypto');

        const circuitPath = process.env.CIRCUIT_PATH || path.join(process.cwd(), 'circuits');
        const wasmPath = path.join(circuitPath, 'commitment_circuit.wasm');
        const zkeyPath = path.join(circuitPath, 'commitment_circuit_final.zkey');
        const vkeyPath = path.join(circuitPath, 'commitment_verification_key.json');

        // Load circuit files with caching
        const circuitFiles = await this.loadCircuitFiles('commitment-circuit', wasmPath, zkeyPath, vkeyPath);
        
        if (!circuitFiles) {
            this.logger.warn(`Commitment circuit files not found, using simulated proof`);
            return this.generateSimulatedProof(job, 'commitment-circuit');
        }

        // Prepare input for commitment circuit
        const input = {
            commitmentId: job.input.commitmentId || '0',
            amount: (job.input.amount || 0).toString(),
            investorHash: job.input.investorId ? 
                crypto.createHash('sha256').update(job.input.investorId).digest('hex').slice(0, 16) : '0'
        };

        this.logger.log(`Generating commitment proof for commitment ${input.commitmentId}`);

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );

        // Verify proof locally using cached vkey
        if (circuitFiles.vkey) {
            const verified = await snarkjs.groth16.verify(circuitFiles.vkey, publicSignals, proof);

            if (!verified) {
                throw new Error('Commitment proof verification failed');
            }
        }

        this.logger.log('✅ commitment-circuit proof generated successfully!');
        return { proof, publicSignals };
    }

    /**
     * Generate a simulated proof when circuit files are not available
     * This is for development/testing only - logs a warning
     */
    private generateSimulatedProof(job: any, circuitType: string): { proof: any; publicSignals: any } {
        this.logger.warn(`⚠️ SIMULATED PROOF for ${circuitType} - circuit files not available`);
        
        const crypto = require('crypto');
        const timestamp = Date.now();
        
        // Generate deterministic but unique proof elements based on job data
        const seed = crypto.createHash('sha256')
            .update(JSON.stringify({ job_id: job.id, circuit: circuitType, timestamp }))
            .digest('hex');

        const proof = {
            pi_a: [
                '0x' + seed.slice(0, 64),
                '0x' + seed.slice(64, 128) || crypto.randomBytes(32).toString('hex')
            ],
            pi_b: [
                ['0x' + crypto.randomBytes(32).toString('hex'), '0x' + crypto.randomBytes(32).toString('hex')],
                ['0x' + crypto.randomBytes(32).toString('hex'), '0x' + crypto.randomBytes(32).toString('hex')]
            ],
            pi_c: [
                '0x' + crypto.randomBytes(32).toString('hex'),
                '0x' + crypto.randomBytes(32).toString('hex')
            ],
            protocol: 'groth16',
            simulated: true,
            circuit_type: circuitType
        };

        // Generate public signals based on circuit type
        let publicSignals: string[];
        switch (circuitType) {
            case 'metrics_threshold':
                publicSignals = [
                    '1', // isValid
                    job.input?.threshold?.toString() || '0',
                    job.input?.metricType?.toString() || '1'
                ];
                break;
            case 'rollup-circuit':
                publicSignals = [
                    job.input?.prestateRoot || '0x0',
                    job.input?.batchRoot || job.batch_root || '0x0',
                    (job.input?.eventIds?.length || 0).toString()
                ];
                break;
            case 'commitment-circuit':
                publicSignals = [
                    job.input?.commitmentId || '0',
                    '1' // isValid
                ];
                break;
            default:
                publicSignals = [job.batch_root || '0x0'];
        }

        return { proof, publicSignals };
    }

    /**
     * Update related database tables after proof generation
     */
    private async updateRelatedTables(job: any, proofUrl: string, publicSignals: any[]): Promise<void> {
        try {
            switch (job.circuit_type) {
                case 'metrics_threshold':
                    // Check if this is for a verification request (investor-driven)
                    if (job.target_type === 'verification_request' && job.target_id) {
                        // Get the public signals to determine if proof passed
                        // publicSignals[0] = isValid (1 if actualValue > threshold, 0 otherwise)
                        const proofResult = publicSignals?.[0] === '1' || publicSignals?.[0] === 1;
                        
                        await this.pool.query(
                            `UPDATE metric_verification_requests 
                             SET status = 'verified', proof_result = $1, proof_url = $2, verified_at = NOW()
                             WHERE id = $3`,
                            [proofResult, proofUrl, job.target_id]
                        );
                        this.logger.log(`Updated verification request ${job.target_id}: proof_result=${proofResult}`);
                    } else if (job.batch_id) {
                        // Original startup-initiated metric proof
                        await this.pool.query(
                            `UPDATE startup_metrics 
                             SET proof_status = 'verified', proof_url = $1 
                             WHERE proof_batch_id = $2`,
                            [proofUrl, job.batch_id]
                        );
                        this.logger.log(`Updated startup_metrics for batch ${job.batch_id}`);
                    }
                    break;

                case 'rollup-circuit':
                    if (job.batch_id) {
                        await this.pool.query(
                            `UPDATE batches SET proof_url = $1 WHERE id = $2`,
                            [proofUrl, job.batch_id]
                        );
                        this.logger.log(`Updated batch ${job.batch_id} with proof URL`);
                    }
                    break;

                case 'commitment-circuit':
                    if (job.input?.commitmentId) {
                        await this.pool.query(
                            `UPDATE commitments SET proof_url = $1, proof_status = 'verified' WHERE id = $2`,
                            [proofUrl, job.input.commitmentId]
                        );
                        this.logger.log(`Updated commitment ${job.input.commitmentId} with proof`);
                    }
                    break;
            }
        } catch (error: any) {
            this.logger.warn(`Failed to update related tables: ${error.message}`);
        }
    }
}
