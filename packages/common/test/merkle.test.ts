import { describe, it, expect } from 'bun:test';
import { MerkleTreeBuilder, verifyMerkleProof } from '../src/crypto/merkle';
import * as crypto from 'crypto';

describe('Merkle Tree Properties', () => {
    // Helper to generate random leaves
    const generateLeaves = (count: number): string[] => {
        const leaves: string[] = [];
        for (let i = 0; i < count; i++) {
            leaves.push(crypto.randomBytes(32).toString('hex'));
        }
        return leaves;
    };

    // Property 8: Block Merkle root correctness
    it('should compute correct root for known inputs (Property 8)', () => {
        // Simple case: 2 leaves
        const leaves = ['a'.repeat(64), 'b'.repeat(64)];
        const builder = new MerkleTreeBuilder(leaves);
        const tree = builder.buildTree();

        const hash = crypto.createHash('sha256');
        hash.update(Buffer.from(leaves[0]! + leaves[1]!, 'hex'));
        const expectedRoot = hash.digest('hex');

        expect(tree.root).toBe(expectedRoot);
    });

    // Property 31: Inclusion proof verification
    it('should verify valid inclusion proofs (Property 31)', () => {
        const leaves = generateLeaves(10); // Even number
        const builder = new MerkleTreeBuilder(leaves);
        const tree = builder.buildTree();

        for (let i = 0; i < leaves.length; i++) {
            const path = builder.getPath(i);
            const isValid = verifyMerkleProof(leaves[i]!, path, tree.root);
            expect(isValid).toBe(true);
        }
    });

    it('should verify valid inclusion proofs for odd number of leaves', () => {
        const leaves = generateLeaves(7); // Odd number
        const builder = new MerkleTreeBuilder(leaves);
        const tree = builder.buildTree();

        for (let i = 0; i < leaves.length; i++) {
            const path = builder.getPath(i);
            const isValid = verifyMerkleProof(leaves[i]!, path, tree.root);
            expect(isValid).toBe(true);
        }
    });

    it('should reject invalid proofs', () => {
        const leaves = generateLeaves(4);
        const builder = new MerkleTreeBuilder(leaves);
        const tree = builder.buildTree();

        const path = builder.getPath(0);
        // Tamper with sibling
        path.siblings[0]!.hash = '0'.repeat(64);

        const isValid = verifyMerkleProof(leaves[0]!, path, tree.root);
        expect(isValid).toBe(false);
    });
});
