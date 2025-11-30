import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Client } from 'pg';
import { runMigrations } from '../src/migrate';
import * as path from 'path';

// Skip tests if no database connection (e.g. CI without service, or docker missing)
const shouldRun = process.env.DATABASE_URL || process.env.CI;

describe('Database Schema', () => {
    if (!shouldRun) {
        it.skip('should run database tests (requires running postgres)', () => { });
        return;
    }

    let client: Client;

    beforeAll(async () => {
        client = new Client({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/zkp_ledger',
        });
        await client.connect();
        // Clean up
        await client.query('DROP TABLE IF EXISTS events, blocks, prover_jobs, batches CASCADE');
        // Run migrations
        await runMigrations(client, path.join(import.meta.dir, '../migrations'));
    });

    afterAll(async () => {
        await client.end();
    });

    it('should store and retrieve events with JSONB payload', async () => {
        const event = {
            type: 'transfer',
            payload: { from: 'alice', to: 'bob', amount: 100 },
            signer: 'alice_key',
            signature: 'sig_123',
        };

        const res = await client.query(
            'INSERT INTO events (type, payload, signer, signature) VALUES ($1, $2, $3, $4) RETURNING id, payload',
            [event.type, event.payload, event.signer, event.signature]
        );

        expect(res.rows[0].id).toBeDefined();
        expect(res.rows[0].payload).toEqual(event.payload);
    });

    it('should enforce constraints on prover_jobs status', async () => {
        const job = {
            target_type: 'event',
            target_id: 'some-id',
            circuit: 'transfer_v1',
            status: 'invalid_status', // Should fail
        };

        try {
            await client.query(
                'INSERT INTO prover_jobs (target_type, target_id, circuit, status) VALUES ($1, $2, $3, $4)',
                [job.target_type, job.target_id, job.circuit, job.status]
            );
            expect(true).toBe(false); // Should not reach here
        } catch (err: any) {
            expect(err.message).toContain('check constraint');
        }
    });

    it('should support JSONB indexing queries', async () => {
        // Insert another event
        await client.query(
            'INSERT INTO events (type, payload, signer, signature) VALUES ($1, $2, $3, $4)',
            ['transfer', { from: 'charlie', to: 'dave', amount: 50 }, 'charlie_key', 'sig_456']
        );

        // Query using JSONB operator
        const res = await client.query(
            "SELECT * FROM events WHERE payload->>'from' = 'alice'"
        );

        expect(res.rows.length).toBe(1);
        expect(res.rows[0].payload.from).toBe('alice');
    });
});
