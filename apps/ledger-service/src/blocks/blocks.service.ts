import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { canonicalHash, serializeCanonical, MerkleTreeBuilder } from '@zkp-ledger/common';

@Injectable()
export class BlocksService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async createBlock() {
        // 1. Fetch unbatched/unblocked events with proper status filtering
        // Select events that haven't been included in a block yet (block_id is NULL or status='pending_block')
        const eventsResult = await this.pool.query(
            `SELECT id, type, payload, signer FROM events 
             WHERE block_id IS NULL 
             AND (block_status IS NULL OR block_status = 'pending_block')
             ORDER BY created_at ASC 
             LIMIT 10`
        );
        const events = eventsResult.rows;

        if (events.length === 0) {
            return null; // No events to block
        }

        // 2. Get latest block for prev_hash
        const latestBlock = await this.getLatestBlock();
        const prevHash = latestBlock ? latestBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
        const index = latestBlock ? parseInt(latestBlock.index) + 1 : 1;

        // 3. Compute Merkle Root
        // Hash the canonical representation of each event for security
        const crypto = require('crypto');
        const hashedLeaves = events.map(e => {
            // Create canonical hash of the event data for proper Merkle tree construction
            const eventData = {
                id: e.id,
                type: e.type,
                payload: e.payload,
                signer: e.signer,
                format_version: '1.0'
            };
            return canonicalHash(eventData);
        });
        const leaves = events.map(e => e.id);

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
        const block = result.rows[0];

        // 7. Update events with block reference
        const eventIds = events.map(e => e.id);
        await this.pool.query(
            `UPDATE events SET block_id = $1, block_status = 'included' WHERE id = ANY($2)`,
            [block.id, eventIds]
        );

        return block;
    }

    async getLatestBlock() {
        const result = await this.pool.query('SELECT * FROM blocks ORDER BY index DESC LIMIT 1');
        return result.rows[0];
    }

    async getBlock(index: number) {
        const result = await this.pool.query('SELECT * FROM blocks WHERE index = $1', [index]);
        return result.rows[0];
    }

    /**
     * Verify blockchain integrity using streaming/pagination to avoid OOM
     * Processes blocks in batches to handle large chains efficiently
     */
    async verifyChain() {
        const crypto = require('crypto');
        const errors: string[] = [];
        const batchSize = 100; // Process 100 blocks at a time
        let offset = 0;
        let totalCount = 0;
        let prevBlock: any = null;

        // Get total count first
        const countResult = await this.pool.query('SELECT COUNT(*) as count FROM blocks');
        const totalBlocks = parseInt(countResult.rows[0].count);

        if (totalBlocks === 0) {
            return { valid: true, count: 0, errors };
        }

        // Process blocks in batches using cursor-based pagination
        while (offset < totalBlocks) {
            const result = await this.pool.query(
                'SELECT index, prev_hash, hash, canonical_payload FROM blocks ORDER BY index ASC LIMIT $1 OFFSET $2',
                [batchSize, offset]
            );
            const blocks = result.rows;

            if (blocks.length === 0) break;

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const globalIndex = offset + i;

                // Verify Genesis block
                if (globalIndex === 0) {
                    if (block.index !== '1') {
                        errors.push(`Genesis block has invalid index: ${block.index}`);
                    }
                    if (block.prev_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
                        errors.push(`Genesis block has invalid prev_hash: ${block.prev_hash}`);
                    }
                }

                // 1. Verify Hash
                const recomputedHash = crypto.createHash('sha256').update(block.canonical_payload).digest('hex');
                if (recomputedHash !== block.hash) {
                    errors.push(`Block ${block.index} hash mismatch. Stored: ${block.hash}, Computed: ${recomputedHash}`);
                }

                // 2. Verify Chain Link
                if (prevBlock) {
                    if (block.prev_hash !== prevBlock.hash) {
                        errors.push(`Block ${block.index} prev_hash mismatch. Expected: ${prevBlock.hash}, Actual: ${block.prev_hash}`);
                    }
                    if (parseInt(block.index) !== parseInt(prevBlock.index) + 1) {
                        errors.push(`Block ${block.index} index discontinuity. Prev: ${prevBlock.index}`);
                    }
                }

                prevBlock = block;
                totalCount++;

                // Early exit if too many errors (prevent log spam)
                if (errors.length >= 100) {
                    errors.push(`... truncated after 100 errors`);
                    return { valid: false, count: totalCount, errors };
                }
            }

            offset += batchSize;
        }

        return {
            valid: errors.length === 0,
            count: totalCount,
            errors,
        };
    }
}
