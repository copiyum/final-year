import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEventDto } from './dto/create-event.dto';
import { canonicalHash, MerkleTreeBuilder } from '@zkp-ledger/common';

@Injectable()
export class EventsService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async create(createEventDto: CreateEventDto) {
        // TODO: Validate signature (Requirement 1.4)
        // For now, we assume signature is valid or validated by a guard/pipe

        const { type, payload, commitments, nullifiers, signer, signature } = createEventDto;

        // Normalize and hash payload for verification (optional here, but good practice)
        // const payloadHash = canonicalHash(payload);

        const query = `
      INSERT INTO events (type, payload, commitments, nullifiers, signer, signature, proof_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'none')
      RETURNING id, created_at
    `;

        const values = [
            type,
            JSON.stringify(payload),
            commitments ? JSON.stringify(commitments) : null,
            nullifiers ? JSON.stringify(nullifiers) : null,
            signer,
            signature,
        ];

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async findAll(filter?: Record<string, any>) {
        let query = 'SELECT * FROM events';
        const values: any[] = [];
        const conditions: string[] = [];

        if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
                // Simple equality check for top-level fields or JSONB payload fields
                // This is a basic implementation. For production, use a more robust query builder.
                if (['type', 'signer', 'proof_status'].includes(key)) {
                    values.push(value);
                    conditions.push(`${key} = $${values.length}`);
                } else {
                    // Assume it's a payload field
                    values.push(value);
                    conditions.push(`payload->>'${key}' = $${values.length}`);
                }
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

        // 2. Fetch all events in the batch to compute hashes
        // We need them in the correct order as they appear in event_ids
        // Postgres doesn't guarantee order with IN clause, so we must reorder in app
        const eventsResult = await this.pool.query(
            `SELECT * FROM events WHERE id = ANY($1)`,
            [eventIds]
        );

        const eventsMap = new Map(eventsResult.rows.map(e => [e.id, e]));
        const batchEvents = eventIds.map(eid => eventsMap.get(eid)).filter(e => e !== undefined);

        if (batchEvents.length !== eventIds.length) {
            throw new Error('Data integrity error: Batch contains missing events');
        }

        // 3. Compute Merkle Tree
        const eventHashes = batchEvents.map(e => {
            return canonicalHash({
                type: e.type,
                payload: e.payload,
                signer: e.signer,
                signature: e.signature,
                format_version: '1.0',
                circuit_version: '1.0'
            });
        });

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
            event_index: eventIndex
        };
    }
}
