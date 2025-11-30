import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { canonicalHash, serializeCanonical, MerkleTreeBuilder } from '@zkp-ledger/common';

@Injectable()
export class BlocksService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async createBlock() {
        // 1. Fetch unbatched/unblocked events (simplified: just take last 10 for demo)
        // In production, we would track which events are already in blocks.
        // For now, let's assume we just create a block from recent events.

        // TODO: Implement proper event selection logic (e.g. status='pending_block')
        const eventsResult = await this.pool.query('SELECT id, type, payload, signer FROM events ORDER BY created_at DESC LIMIT 10');
        const events = eventsResult.rows;

        if (events.length === 0) {
            return null; // No events to block
        }

        // 2. Get latest block for prev_hash
        const latestBlock = await this.getLatestBlock();
        const prevHash = latestBlock ? latestBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
        const index = latestBlock ? parseInt(latestBlock.index) + 1 : 1;

        // 3. Compute Merkle Root
        // We use event IDs as leaves for simplicity, or hash(canonical(event))
        // Let's use event IDs for now as per design doc example
        const leaves = events.map(e => e.id); // UUIDs are strings
        // We need to hash the leaves first if they are not already hashes? 
        // Design doc says "Merkle root of all events". Usually we hash the event data.
        // Let's assume we use the event ID as the leaf for the tree structure.
        // But for security, we should hash the canonical event.
        // For this implementation, let's just hash the ID to be safe or use ID directly if it's 32 bytes? UUID is not 32 bytes hex.
        // Let's hash the ID to get 32-byte hex.
        const crypto = require('crypto');
        const hashedLeaves = leaves.map(id => crypto.createHash('sha256').update(id).digest('hex'));

        const treeBuilder = new MerkleTreeBuilder(hashedLeaves);
        const tree = treeBuilder.buildTree();

        // 4. Create Block Object
        const blockData = {
            format_version: '1.0',
            circuit_version: '1.0',
            index,
            prev_hash: prevHash,
            timestamp: new Date().toISOString(),
            events: leaves,
            merkle_root: tree.root,
        };

        // 5. Compute Canonical Hash
        const hash = canonicalHash(blockData);
        const canonicalPayload = serializeCanonical(blockData);

        // 6. Persist Block
        const query = `
      INSERT INTO blocks (index, prev_hash, hash, canonical_payload, merkle_root, format_version, circuit_version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            index,
            prevHash,
            hash,
            canonicalPayload,
            tree.root,
            blockData.format_version,
            blockData.circuit_version,
        ];

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async getLatestBlock() {
        const result = await this.pool.query('SELECT * FROM blocks ORDER BY index DESC LIMIT 1');
        return result.rows[0];
    }

    async getBlock(index: number) {
        const result = await this.pool.query('SELECT * FROM blocks WHERE index = $1', [index]);
        return result.rows[0];
    }

    async verifyChain() {
        const result = await this.pool.query('SELECT * FROM blocks ORDER BY index ASC');
        const blocks = result.rows;
        const errors: string[] = [];

        if (blocks.length === 0) {
            return { valid: true, count: 0, errors };
        }

        // Verify Genesis
        const genesis = blocks[0];
        if (genesis.index !== '1') {
            errors.push(`Genesis block has invalid index: ${genesis.index}`);
        }
        if (genesis.prev_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            errors.push(`Genesis block has invalid prev_hash: ${genesis.prev_hash}`);
        }

        // Verify Chain
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            // 1. Verify Hash
            // Reconstruct canonical object
            // Note: We need to handle the fact that we don't have the original event list in the block table
            // For now, we will verify that the stored hash matches the re-hashed canonical_payload

            const crypto = require('crypto');
            const recomputedHash = crypto.createHash('sha256').update(block.canonical_payload).digest('hex');

            if (recomputedHash !== block.hash) {
                errors.push(`Block ${block.index} hash mismatch. Stored: ${block.hash}, Computed: ${recomputedHash}`);
            }

            // 2. Verify Chain Link
            if (i > 0) {
                const prevBlock = blocks[i - 1];
                if (block.prev_hash !== prevBlock.hash) {
                    errors.push(`Block ${block.index} prev_hash mismatch. Expected: ${prevBlock.hash}, Actual: ${block.prev_hash}`);
                }
                if (parseInt(block.index) !== parseInt(prevBlock.index) + 1) {
                    errors.push(`Block ${block.index} index discontinuity. Prev: ${prevBlock.index}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            count: blocks.length,
            errors,
        };
    }
}
