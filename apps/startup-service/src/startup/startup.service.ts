import { Injectable, NotFoundException, ForbiddenException, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { StorageService } from '@zkp-ledger/storage';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface CreateStartupDTO {
    name: string;
    description?: string;
    sector?: string;
    teamSize?: number;
    fundingAsk?: number;
}

interface UpdateStartupDTO {
    name?: string;
    description?: string;
    sector?: string;
    teamSize?: number;
    fundingAsk?: number;
}

@Injectable()
export class StartupService implements OnModuleInit {
    private readonly logger = new Logger(StartupService.name);
    private storage: StorageService;
    private readonly ledgerServiceUrl: string;
    private readonly proverCoordinatorUrl: string;
    private encryptionKey: Buffer;

    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private httpService: HttpService,
    ) {
        this.storage = new StorageService();
        this.ledgerServiceUrl = process.env.LEDGER_SERVICE_URL || 'http://localhost:3000';
        this.proverCoordinatorUrl = process.env.PROVER_COORDINATOR_URL || 'http://localhost:3001';
    }

    onModuleInit() {
        // Derive encryption key from ENCRYPTION_SECRET or SIGNING_SECRET
        const secret = process.env.ENCRYPTION_SECRET || process.env.SIGNING_SECRET;
        if (!secret) {
            throw new Error('ENCRYPTION_SECRET or SIGNING_SECRET environment variable is required');
        }
        // Derive a 32-byte key using SHA-256
        this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
    }

    /**
     * Encrypt a value using AES-256-GCM
     */
    private encryptValue(value: string): string {
        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        
        // Format: iv:authTag:encryptedData (all hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt a value encrypted with AES-256-GCM
     */
    private decryptValue(encryptedValue: string): string {
        // Handle legacy base64-only values
        if (!encryptedValue.includes(':')) {
            return Buffer.from(encryptedValue, 'base64').toString('utf8');
        }
        
        const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Generate a cryptographic signature for an event
     * Uses HMAC-SHA256 with a secret key for message authentication
     */
    private generateSignature(type: string, payload: any, signer: string, timestamp: number): string {
        const signingKey = process.env.SIGNING_SECRET;
        if (!signingKey) {
            throw new Error('SIGNING_SECRET environment variable is required');
        }
        const message = JSON.stringify({ type, payload, signer, timestamp });
        return crypto.createHmac('sha256', signingKey).update(message).digest('hex');
    }

    /**
     * Hash an event to the ledger service
     */
    private async hashEventToLedger(type: string, payload: any, signer: string): Promise<string> {
        try {
            const timestamp = Date.now();
            const signature = this.generateSignature(type, payload, signer, timestamp);
            
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
            this.logger.error(`Failed to hash event to ledger: ${error.message}`);
            throw error;
        }
    }

    /**
     * Request ZKP proof generation for a metric threshold
     */
    private async requestMetricProof(
        metricId: string,
        actualValue: number,
        threshold: number,
        metricType: number = 1
    ): Promise<string> {
        try {
            // Create a batch entry for this metric proof request
            const batchResult = await this.pool.query(
                `INSERT INTO batches (id, event_ids, prestate_root, poststate_root, status)
                 VALUES (gen_random_uuid(), $1, '0x0', '0x0', 'pending')
                 RETURNING id`,
                [JSON.stringify([metricId])]
            );
            const batchId = batchResult.rows[0].id;

            // Request proof from Prover Coordinator
            const response = await firstValueFrom(
                this.httpService.post(`${this.proverCoordinatorUrl}/jobs`, {
                    target_type: 'batch',
                    target_id: batchId,
                    circuit: 'metrics_threshold',
                    witness_data: {
                        actualValue,
                        threshold,
                        metricType,
                        batchRoot: batchId,
                    },
                    priority: 10,
                })
            );

            this.logger.log(`Proof job created: ${response.data.id} for metric ${metricId}`);

            // Update metric with batch reference
            await this.pool.query(
                `UPDATE startup_metrics SET proof_batch_id = $1 WHERE id = $2`,
                [batchId, metricId]
            );

            return response.data.id;
        } catch (error: any) {
            this.logger.error(`Failed to request metric proof: ${error.message}`);
            throw error;
        }
    }

    async create(founderId: string, dto: CreateStartupDTO) {
        const result = await this.pool.query(
            `INSERT INTO startups (founder_id, name, description, sector, team_size, funding_ask)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, founder_id, name, description, sector, team_size, funding_ask, created_at, updated_at`,
            [founderId, dto.name, dto.description, dto.sector, dto.teamSize, dto.fundingAsk]
        );

        const startup = result.rows[0];

        // Hash startup.created event to Ledger Service
        try {
            await this.hashEventToLedger(
                'startup.created',
                { startup_id: startup.id, name: startup.name, sector: startup.sector },
                founderId
            );
        } catch (error: any) {
            this.logger.warn(`Failed to hash startup.created event: ${error.message}`);
        }

        return startup;
    }

    async findAll(userId?: string, userRole?: string) {
        // If investor, only show startups they have access to
        // If founder, show their own startups
        // If no user, show public startups (for now, all)

        let query = `
      SELECT s.id, s.name, s.description, s.sector, s.team_size, s.funding_ask, s.created_at
      FROM startups s
    `;

        if (userRole === 'investor' && userId) {
            query += `
        LEFT JOIN access_permissions ap ON s.id = ap.startup_id AND ap.investor_id = $1
        WHERE ap.granted_at IS NOT NULL AND ap.revoked_at IS NULL
      `;
            const result = await this.pool.query(query, [userId]);
            return result.rows;
        } else if (userRole === 'founder' && userId) {
            query += ` WHERE s.founder_id = $1`;
            const result = await this.pool.query(query, [userId]);
            return result.rows;
        } else {
            // Public view - all startups
            const result = await this.pool.query(query);
            return result.rows;
        }
    }

    async findOne(id: string, userId?: string, userRole?: string) {
        const result = await this.pool.query(
            `SELECT * FROM startups WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Startup not found');
        }

        const startup = result.rows[0];

        // Check access permissions
        if (userRole === 'investor' && userId) {
            const accessCheck = await this.pool.query(
                `SELECT * FROM access_permissions 
         WHERE startup_id = $1 AND investor_id = $2 
         AND granted_at IS NOT NULL AND revoked_at IS NULL`,
                [id, userId]
            );

            if (accessCheck.rows.length === 0) {
                throw new ForbiddenException('Access denied to this startup');
            }
        } else if (userRole === 'founder' && userId && startup.founder_id !== userId) {
            throw new ForbiddenException('You can only view your own startups');
        }

        return startup;
    }

    async update(id: string, founderId: string | undefined, dto: UpdateStartupDTO) {
        // Verify startup exists
        const startupCheck = await this.pool.query(
            `SELECT id, founder_id FROM startups WHERE id = $1`,
            [id]
        );

        if (startupCheck.rows.length === 0) {
            throw new NotFoundException('Startup not found');
        }

        // Verify ownership - founderId is required for authenticated requests
        if (founderId) {
            if (startupCheck.rows[0].founder_id !== founderId) {
                throw new ForbiddenException('You can only update your own startup');
            }
        } else {
            // For unauthenticated requests (admin/system operations), log the action
            this.logger.warn(`Startup ${id} updated without founder verification (system operation)`);
        }

        const fields = [];
        const values = [];
        let paramCount = 1;

        if (dto.name !== undefined) {
            fields.push(`name = $${paramCount++}`);
            values.push(dto.name);
        }
        if (dto.description !== undefined) {
            fields.push(`description = $${paramCount++}`);
            values.push(dto.description);
        }
        if (dto.sector !== undefined) {
            fields.push(`sector = $${paramCount++}`);
            values.push(dto.sector);
        }
        if (dto.teamSize !== undefined) {
            fields.push(`team_size = $${paramCount++}`);
            values.push(dto.teamSize);
        }
        if (dto.fundingAsk !== undefined) {
            fields.push(`funding_ask = $${paramCount++}`);
            values.push(dto.fundingAsk);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);
        const result = await this.pool.query(
            `UPDATE startups SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        return result.rows[0];
    }

    async uploadDocument(startupId: string, founderId: string, file: Express.Multer.File, documentType: string) {
        // Verify ownership
        const ownerCheck = await this.pool.query(
            `SELECT id FROM startups WHERE id = $1 AND founder_id = $2`,
            [startupId, founderId]
        );

        if (ownerCheck.rows.length === 0) {
            throw new ForbiddenException('You can only upload documents to your own startup');
        }

        // Upload to MinIO
        const fileKey = `documents/${startupId}/${Date.now()}_${file.originalname}`;
        await this.storage.uploadProof(fileKey, file.buffer.toString('base64'));

        // Store metadata
        const result = await this.pool.query(
            `INSERT INTO startup_documents (startup_id, document_type, file_key, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [startupId, documentType, fileKey, file.size]
        );

        // Hash document.uploaded event to Ledger
        try {
            await this.hashEventToLedger(
                'document.uploaded',
                { startup_id: startupId, document_id: result.rows[0].id, document_type: documentType },
                founderId
            );
        } catch (error: any) {
            this.logger.warn(`Failed to hash document.uploaded event: ${error.message}`);
        }

        return result.rows[0];
    }

    async getDocuments(startupId: string) {
        const result = await this.pool.query(
            `SELECT id, startup_id, document_type, file_key, file_size, upload_event_id, created_at 
       FROM startup_documents 
       WHERE startup_id = $1 
       ORDER BY created_at DESC`,
            [startupId]
        );

        return result.rows;
    }

    async getDocumentDownloadUrl(startupId: string, documentId: string) {
        // Verify document exists and belongs to the startup
        const result = await this.pool.query(
            `SELECT file_key FROM startup_documents WHERE id = $1 AND startup_id = $2`,
            [documentId, startupId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Document not found');
        }

        const fileKey = result.rows[0].file_key;

        // Generate presigned URL for download (valid for 1 hour)
        const presignedUrl = await this.storage.getPresignedUrl(fileKey, 3600);

        return { url: presignedUrl, expires_in: 3600 };
    }

    async grantAccess(startupId: string, founderId: string, investorId: string) {
        // Verify ownership
        const ownerCheck = await this.pool.query(
            `SELECT id FROM startups WHERE id = $1 AND founder_id = $2`,
            [startupId, founderId]
        );

        if (ownerCheck.rows.length === 0) {
            throw new ForbiddenException('You can only grant access to your own startup');
        }

        // Grant access
        const result = await this.pool.query(
            `INSERT INTO access_permissions (startup_id, investor_id, access_level, granted_at)
       VALUES ($1, $2, 'full', NOW())
       ON CONFLICT (startup_id, investor_id) 
       DO UPDATE SET granted_at = NOW(), revoked_at = NULL
       RETURNING *`,
            [startupId, investorId]
        );

        // Hash access.granted event to Ledger
        try {
            await this.hashEventToLedger(
                'access.granted',
                { startup_id: startupId, investor_id: investorId },
                founderId
            );
        } catch (error: any) {
            this.logger.warn(`Failed to hash access.granted event: ${error.message}`);
        }

        return result.rows[0];
    }

    async revokeAccess(startupId: string, founderId: string, investorId: string) {
        // Verify ownership
        const ownerCheck = await this.pool.query(
            `SELECT id FROM startups WHERE id = $1 AND founder_id = $2`,
            [startupId, founderId]
        );

        if (ownerCheck.rows.length === 0) {
            throw new ForbiddenException('You can only revoke access to your own startup');
        }

        // Revoke access
        const result = await this.pool.query(
            `UPDATE access_permissions 
       SET revoked_at = NOW() 
       WHERE startup_id = $1 AND investor_id = $2
       RETURNING *`,
            [startupId, investorId]
        );

        // Hash access.revoked event to Ledger
        try {
            await this.hashEventToLedger(
                'access.revoked',
                { startup_id: startupId, investor_id: investorId },
                founderId
            );
        } catch (error: any) {
            this.logger.warn(`Failed to hash access.revoked event: ${error.message}`);
        }

        return result.rows[0];
    }

    async addMetric(startupId: string, founderId: string, metricName: string, metricValue: number, threshold?: number) {
        // Verify ownership
        const ownerCheck = await this.pool.query(
            `SELECT id FROM startups WHERE id = $1 AND founder_id = $2`,
            [startupId, founderId]
        );

        if (ownerCheck.rows.length === 0) {
            throw new ForbiddenException('You can only add metrics to your own startup');
        }

        // Encrypt the metric value using AES-256-GCM
        const encryptedValue = this.encryptValue(metricValue.toString());

        // Store threshold if provided
        const thresholdValue = threshold !== undefined ? threshold : Math.floor(metricValue * 0.8); // Default: 80% of value

        const result = await this.pool.query(
            `INSERT INTO startup_metrics (startup_id, metric_name, metric_value_encrypted, threshold_value, proof_status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING *`,
            [startupId, metricName, encryptedValue, thresholdValue]
        );

        const metric = result.rows[0];

        // Hash metric.added event to Ledger
        try {
            const eventId = await this.hashEventToLedger(
                'metric.added',
                {
                    startup_id: startupId,
                    metric_id: metric.id,
                    metric_name: metricName,
                    threshold: thresholdValue,
                    has_threshold: true,
                },
                founderId
            );

            // Update metric with event reference
            await this.pool.query(
                `UPDATE startup_metrics SET event_id = $1 WHERE id = $2`,
                [eventId, metric.id]
            );

            this.logger.log(`Metric ${metric.id} event hashed: ${eventId}`);
        } catch (error: any) {
            this.logger.warn(`Failed to hash metric event to ledger: ${error.message}`);
        }

        // Request ZKP proof generation for this metric
        try {
            const jobId = await this.requestMetricProof(
                metric.id,
                metricValue,
                thresholdValue,
                this.getMetricTypeCode(metricName)
            );
            this.logger.log(`ZKP proof job ${jobId} requested for metric ${metric.id}`);
        } catch (error: any) {
            this.logger.warn(`Failed to request ZKP proof: ${error.message}`);
            // Don't fail the metric creation, proof can be retried later
        }

        return metric;
    }

    /**
     * Map metric name to a numeric type code for the circuit
     */
    private getMetricTypeCode(metricName: string): number {
        const typeMap: Record<string, number> = {
            'users': 1,
            'revenue': 2,
            'mrr': 3,
            'arr': 4,
            'growth': 5,
            'customers': 6,
            'dau': 7,
            'mau': 8,
            'wau': 9,
        };
        const normalized = metricName.toLowerCase().replace(/[^a-z]/g, '');
        return typeMap[normalized] || 1;
    }

    /**
     * Retry proof generation for a metric
     */
    async retryMetricProof(metricId: string, founderId: string): Promise<any> {
        // Get metric and verify ownership
        const metricResult = await this.pool.query(
            `SELECT sm.*, s.founder_id 
             FROM startup_metrics sm
             JOIN startups s ON sm.startup_id = s.id
             WHERE sm.id = $1`,
            [metricId]
        );

        if (metricResult.rows.length === 0) {
            throw new NotFoundException('Metric not found');
        }

        const metric = metricResult.rows[0];
        if (metric.founder_id !== founderId) {
            throw new ForbiddenException('You can only retry proofs for your own metrics');
        }

        // Decode the actual value using proper decryption
        const actualValue = parseInt(this.decryptValue(metric.metric_value_encrypted));
        const threshold = metric.threshold_value || Math.floor(actualValue * 0.8);

        // Reset status and request new proof
        await this.pool.query(
            `UPDATE startup_metrics SET proof_status = 'pending', proof_batch_id = NULL WHERE id = $1`,
            [metricId]
        );

        const jobId = await this.requestMetricProof(
            metricId,
            actualValue,
            threshold,
            this.getMetricTypeCode(metric.metric_name)
        );

        return { jobId, metricId, status: 'pending' };
    }

    async getMetrics(startupId: string) {
        const result = await this.pool.query(
            `SELECT id, startup_id, metric_name, metric_value_encrypted, threshold_value, 
                    proof_batch_id, proof_status, proof_url, event_id, created_at
             FROM startup_metrics 
             WHERE startup_id = $1 
             ORDER BY created_at DESC`,
            [startupId]
        );

        return result.rows;
    }

    async getVerificationStatus(startupId: string) {
        const result = await this.pool.query(
            `SELECT 
        COUNT(*) FILTER (WHERE proof_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE proof_status = 'pending') as pending
       FROM startup_metrics 
       WHERE startup_id = $1`,
            [startupId]
        );

        return {
            verified: parseInt(result.rows[0].verified) > 0,
            pending: parseInt(result.rows[0].pending),
        };
    }

    async getAccessRequests(startupId: string, founderId: string) {
        // Verify ownership
        const ownerCheck = await this.pool.query(
            `SELECT id FROM startups WHERE id = $1 AND founder_id = $2`,
            [startupId, founderId]
        );

        if (ownerCheck.rows.length === 0) {
            throw new ForbiddenException('You can only view access requests for your own startup');
        }

        // Get pending access requests (granted_at is NULL means pending)
        const result = await this.pool.query(
            `SELECT ap.id, ap.startup_id, ap.investor_id, ap.access_level,
                    u.email as investor_email, u.role as investor_role
             FROM access_permissions ap
             LEFT JOIN users u ON ap.investor_id = u.id
             WHERE ap.startup_id = $1 AND ap.granted_at IS NULL AND ap.revoked_at IS NULL`,
            [startupId]
        );

        return result.rows;
    }
}
