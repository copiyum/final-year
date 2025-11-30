import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEventDto } from './dto/create-event.dto';
import { canonicalHash, MerkleTreeBuilder } from '@zkp-ledger/common';
import * as crypto from 'crypto';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);
    private readonly signatureValidityWindowMs = 5 * 60 * 1000; // 5 minutes

    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    /**
     * Validate HMAC signature for an event
     * Uses timestamp embedded in signature format: signature:timestamp (hex:unix_ms)
     * Falls back to checking discrete time buckets if no timestamp provided
     */
    private validateSignature(type: string, payload: any, signer: string, signature: string): boolean {
        const signingKey = process.env.SIGNING_SECRET;
        if (!signingKey) {
            this.logger.error('SIGNING_SECRET environment variable is required for signature validation');
            return false;
        }
        
        // Check for new format: signature:timestamp
        if (signature.includes(':')) {
            const [sig, timestampStr] = signature.split(':');
            if (!/^[a-f0-9]{64}$/i.test(sig)) return false;
            
            const timestamp = parseInt(timestampStr, 10);
            if (isNaN(timestamp)) return false;
            
            const now = Date.now();
            // Reject if timestamp is outside validity window
            if (timestamp < now - this.signatureValidityWindowMs || timestamp > now + 60000) {
                return false;
            }
            
            const message = JSON.stringify({ type, payload, signer, timestamp });
            const expectedSignature = crypto.createHmac('sha256', signingKey).update(message).digest('hex');
            
            try {
                return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'));
            } catch {
                return false;
            }
        }
        
        // Legacy format: plain signature - check discrete time buckets (30-second intervals)
        if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
            return false;
        }
        
        const now = Date.now();
        const bucketSize = 30000; // 30-second buckets instead of 1-second (reduces from 300 to 10 checks)
        const windowStart = now - this.signatureValidityWindowMs;
        
        // Check signatures at bucket boundaries within the validity window
        for (let timestamp = Math.floor(windowStart / bucketSize) * bucketSize; timestamp <= now; timestamp += bucketSize) {
            const message = JSON.stringify({ type, payload, signer, timestamp });
            const expectedSignature = crypto.createHmac('sha256', signingKey).update(message).digest('hex');
            
            try {
                if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
                    return true;
                }
            } catch {
                continue;
            }
        }
        
        return false;
    }

    async create(createEventDto: CreateEventDto) {
        const { type, payload, commitments, nullifiers, signer, signature } = createEventDto;

        // Validate signature (Requirement 1.4)
        if (signature && !this.validateSignature(type, payload, signer, signature)) {
            this.logger.warn(`Invalid signature for event from signer ${signer}`);
            throw new BadRequestException('Invalid event signature');
        }

        // Pre-compute and store the leaf hash for efficient Merkle proof generation
        const leafHash = canonicalHash({
            type,
            payload,
            signer,
            signature,
            format_version: '1.0',
            circuit_version: '1.0'
        });

        const query = `
            INSERT INTO events (type, payload, commitments, nullifiers, signer, signature, proof_status, leaf_hash)
            VALUES ($1, $2, $3, $4, $5, $6, 'none', $7)
            RETURNING id, created_at, leaf_hash
        `;

        const values = [
            type,
            JSON.stringify(payload),
            commitments ? JSON.stringify(commitments) : null,
            nullifiers ? JSON.stringify(nullifiers) : null,
            signer,
            signature,
            leafHash,
        ];

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async findAll(filter?: Record<string, any>) {
        let query = 'SELECT * FROM events';
        const values: any[] = [];
        const conditions: string[] = [];

        if (filter) {
            // Whitelist of allowed top-level filter fields for security
            const allowedTopLevelFields = ['type', 'signer', 'proof_status', 'block_status'];
            // Whitelist of allowed payload fields
            const allowedPayloadFields = ['startup_id', 'investor_id', 'user_id', 'metric_id', 'commitment_id'];

            Object.entries(filter).forEach(([key, value]) => {
                // Sanitize key to prevent SQL injection
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
                
                if (allowedTopLevelFields.includes(sanitizedKey)) {
                    values.push(value);
                    conditions.push(`${sanitizedKey} = $${values.length}`);
                } else if (allowedPayloadFields.includes(sanitizedKey)) {
                    values.push(value);
                    conditions.push(`payload->>'${sanitizedKey}' = $${values.length}`);
                }
                // Ignore unknown fields for security
            });
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await this.pool.query(query, values);
        return result.rows;
    }

    async findOne(id: string) {
        const result = await this.pool.query('SELECT * FROM events WHERE id = $1', [id]);
        return result.rows[0];
    }

    async getInclusionProof(id: string) {
        // 1. Find the batch containing this event
        const batchResult = await this.pool.query(
            `SELECT * FROM batches WHERE event_ids @> $1::jsonb LIMIT 1`,
            [JSON.stringify([id])]
        );

        if (batchResult.rows.length === 0) {
            // Check if event exists
            const event = await this.findOne(id);
            if (!event) {
                throw new NotFoundException(`Event ${id} not found`);
            }
            return { status: 'pending', reason: 'Event not yet batched' };
        }

        const batch = batchResult.rows[0];
        const eventIds: string[] = batch.event_ids;

        // 2. Fetch leaf hashes in the correct order
        // Use stored leaf_hash if available, otherwise compute on the fly
        const eventsResult = await this.pool.query(
            `SELECT id, type, payload, signer, signature, leaf_hash FROM events WHERE id = ANY($1)`,
            [eventIds]
        );

        const eventsMap = new Map(eventsResult.rows.map(e => [e.id, e]));
        
        // Build ordered list of leaf hashes
        const eventHashes: string[] = [];
        for (const eid of eventIds) {
            const event = eventsMap.get(eid);
            if (!event) {
                throw new Error(`Data integrity error: Event ${eid} not found in batch`);
            }
            
            // Use stored leaf_hash if available, otherwise compute
            if (event.leaf_hash) {
                eventHashes.push(event.leaf_hash);
            } else {
                // Fallback: compute hash for legacy events without stored leaf_hash
                const hash = canonicalHash({
                    type: event.type,
                    payload: event.payload,
                    signer: event.signer,
                    signature: event.signature,
                    format_version: '1.0',
                    circuit_version: '1.0'
                });
                eventHashes.push(hash);
            }
        }

        // 3. Build Merkle Tree and get path
        const tree = new MerkleTreeBuilder(eventHashes);
        const eventIndex = eventIds.indexOf(id);

        if (eventIndex === -1) {
            throw new Error('Event ID found in batch but not in event list');
        }

        const path = tree.getPath(eventIndex);

        return {
            status: 'included',
            batch_id: batch.id,
            batch_root: batch.poststate_root,
            merkle_path: path,
            event_index: eventIndex,
            leaf_hash: eventHashes[eventIndex]
        };
    }

    /**
     * Backfill leaf hashes for existing events that don't have them
     * Run this as a migration or maintenance task
     */
    async backfillLeafHashes(): Promise<{ updated: number }> {
        const result = await this.pool.query(
            `SELECT id, type, payload, signer, signature FROM events WHERE leaf_hash IS NULL LIMIT 1000`
        );

        let updated = 0;
        for (const event of result.rows) {
            const leafHash = canonicalHash({
                type: event.type,
                payload: event.payload,
                signer: event.signer,
                signature: event.signature,
                format_version: '1.0',
                circuit_version: '1.0'
            });

            await this.pool.query(
                `UPDATE events SET leaf_hash = $1 WHERE id = $2`,
                [leafHash, event.id]
            );
            updated++;
        }

        this.logger.log(`Backfilled ${updated} event leaf hashes`);
        return { updated };
    }
}
