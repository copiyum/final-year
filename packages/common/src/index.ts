// Crypto exports
export { canonicalHash, serializeCanonical } from './crypto/canonical.js';
export { MerkleTreeBuilder, verifyMerkleProof } from './crypto/merkle.js';
export type { MerkleTree, MerklePath } from './crypto/merkle.js';

// Observability exports
export { Logger } from './observability/logger.js';
export { MetricsService } from './observability/metrics.js';

// Constants
export const MIGRATIONS_PATH = process.env.MIGRATIONS_PATH || './migrations';
