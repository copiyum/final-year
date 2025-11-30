import * as crypto from 'crypto';

export interface MerkleTree {
    root: string;
    leaves: string[];
    depth: number;
}

export interface MerklePath {
    leaf_index: number;
    siblings: Array<{
        hash: string;
        position: 'left' | 'right';
    }>;
}

export class MerkleTreeBuilder {
    private leaves: string[];

    constructor(leaves: string[]) {
        this.leaves = leaves;
    }

    /**
     * Builds the Merkle tree from the leaves.
     * Handles odd number of leaves by duplicating the last one.
     */
    buildTree(): MerkleTree {
        if (this.leaves.length === 0) {
            throw new Error('Cannot build tree with no leaves');
        }

        let currentLevel = [...this.leaves];
        const depth = Math.ceil(Math.log2(this.leaves.length));

        while (currentLevel.length > 1) {
            currentLevel = this.hashPairs(currentLevel);
        }

        return {
            root: currentLevel[0]!,
            leaves: this.leaves,
            depth,
        };
    }

    /**
     * Generates a Merkle inclusion proof for a leaf at the given index.
     */
    getPath(leafIndex: number): MerklePath {
        if (leafIndex < 0 || leafIndex >= this.leaves.length) {
            throw new Error('Leaf index out of bounds');
        }

        const siblings: Array<{ hash: string; position: 'left' | 'right' }> = [];
        let currentIndex = leafIndex;
        let currentLevel = [...this.leaves];

        while (currentLevel.length > 1) {
            // Handle odd number of leaves at this level
            if (currentLevel.length % 2 !== 0) {
                currentLevel.push(currentLevel[currentLevel.length - 1]!);
            }

            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            // Sibling should always exist now due to padding
            siblings.push({
                hash: currentLevel[siblingIndex]!,
                position: isLeft ? 'right' : 'left',
            });

            currentIndex = Math.floor(currentIndex / 2);
            currentLevel = this.hashPairs(currentLevel);
        }

        return { leaf_index: leafIndex, siblings };
    }

    private hashPairs(level: string[]): string[] {
        const nextLevel: string[] = [];

        // Pad if odd
        const processingLevel = [...level];
        if (processingLevel.length % 2 !== 0) {
            processingLevel.push(processingLevel[processingLevel.length - 1]!);
        }

        for (let i = 0; i < processingLevel.length; i += 2) {
            const left = processingLevel[i]!;
            const right = processingLevel[i + 1]!;

            const hash = crypto.createHash('sha256');
            // Concatenate hex strings and hash
            hash.update(Buffer.from(left + right, 'hex'));
            nextLevel.push(hash.digest('hex'));
        }

        return nextLevel;
    }
}

/**
 * Verifies a Merkle inclusion proof.
 */
export function verifyMerkleProof(
    leaf: string,
    path: MerklePath,
    root: string
): boolean {
    let currentHash = leaf;

    for (const sibling of path.siblings) {
        const hash = crypto.createHash('sha256');
        if (sibling.position === 'left') {
            hash.update(Buffer.from(sibling.hash + currentHash, 'hex'));
        } else {
            hash.update(Buffer.from(currentHash + sibling.hash, 'hex'));
        }
        currentHash = hash.digest('hex');
    }

    return currentHash === root;
}
