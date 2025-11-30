import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

// Helper to convert UUID or hash to bytes32
function toBytes32(value: string): string {
    // If it's a UUID, hash it to get bytes32
    if (value.includes('-')) {
        return ethers.keccak256(ethers.toUtf8Bytes(value));
    }
    // If it's already a hex string, ensure it's properly formatted
    const hex = value.startsWith('0x') ? value : `0x${value}`;
    // Pad to 32 bytes if needed
    return ethers.zeroPadValue(hex, 32);
}

@Injectable()
export class AnchorService {
    private readonly logger = new Logger(AnchorService.name);
    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: ethers.Wallet | null = null;
    private contract: ethers.Contract | null = null;
    private readonly enabled: boolean;

    constructor() {
        // Initialize provider and wallet from env
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
        const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        const contractAddress = process.env.BATCH_VERIFIER_ADDRESS;

        this.enabled = !!(rpcUrl && privateKey && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000');

        if (this.enabled) {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey!, this.provider);

            // ABI for BatchVerifier
            const abi = [
                "function anchorBatch(bytes32 batchId, bytes32 batchRoot, bytes32 prestateRoot, bytes32 poststateRoot, uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, string metadataURI)",
                "function anchorBatchWithoutProof(bytes32 batchId, bytes32 batchRoot, bytes32 prestateRoot, bytes32 poststateRoot, string metadataURI)",
                "function isBatchVerified(bytes32 batchId) view returns (bool)",
                "function getBatch(bytes32 batchId) view returns (tuple(bytes32 batchRoot, bytes32 prestateRoot, bytes32 poststateRoot, uint256 timestamp, uint256 blockNumber, address submitter, string metadataURI, bool verified))",
                "event BatchVerified(bytes32 indexed batchId, bytes32 indexed batchRoot, uint256 timestamp, address indexed submitter)"
            ];

            this.contract = new ethers.Contract(contractAddress!, abi, this.wallet);
            this.logger.log(`Blockchain anchoring enabled. Contract: ${contractAddress}`);
        } else {
            this.logger.warn('Blockchain anchoring disabled. Set BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, and BATCH_VERIFIER_ADDRESS to enable.');
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async anchorBatch(
        batchId: string,
        batchRoot: string,
        prestateRoot: string,
        poststateRoot: string,
        proof: any,
        metadataURI: string
    ) {
        if (!this.enabled || !this.contract) {
            this.logger.warn(`Blockchain anchoring disabled. Skipping batch ${batchId}`);
            return null;
        }

        try {
            this.logger.log(`Anchoring batch ${batchId} to blockchain...`);

            // Convert values to bytes32 format
            const batchIdBytes32 = toBytes32(batchId);
            const batchRootBytes32 = toBytes32(batchRoot);
            const prestateRootBytes32 = toBytes32(prestateRoot);
            const poststateRootBytes32 = toBytes32(poststateRoot);

            // Convert proof to format expected by contract
            // snarkjs proof format: pi_a, pi_b, pi_c
            // Contract expects: uint256[2], uint256[2][2], uint256[2]
            const pA = [proof.pi_a[0], proof.pi_a[1]];
            const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]]; // Note the swap for G2
            const pC = [proof.pi_c[0], proof.pi_c[1]];

            const tx = await this.contract.anchorBatch(
                batchIdBytes32,
                batchRootBytes32,
                prestateRootBytes32,
                poststateRootBytes32,
                pA,
                pB,
                pC,
                metadataURI
            );

            this.logger.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Batch ${batchId} anchored in block ${receipt.blockNumber}`);

            return {
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error: any) {
            this.logger.error(`Failed to anchor batch ${batchId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Anchor batch without proof verification (for testing/mock mode)
     */
    async anchorBatchWithoutProof(
        batchId: string,
        batchRoot: string,
        prestateRoot: string,
        poststateRoot: string,
        metadataURI: string
    ) {
        if (!this.enabled || !this.contract) {
            this.logger.warn(`Blockchain anchoring disabled. Skipping batch ${batchId}`);
            return null;
        }

        try {
            this.logger.log(`Anchoring batch ${batchId} without proof...`);

            // Convert values to bytes32 format
            const batchIdBytes32 = toBytes32(batchId);
            const batchRootBytes32 = toBytes32(batchRoot);
            const prestateRootBytes32 = toBytes32(prestateRoot);
            const poststateRootBytes32 = toBytes32(poststateRoot);

            const tx = await this.contract.anchorBatchWithoutProof(
                batchIdBytes32,
                batchRootBytes32,
                prestateRootBytes32,
                poststateRootBytes32,
                metadataURI
            );

            this.logger.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Batch ${batchId} anchored in block ${receipt.blockNumber}`);

            return {
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error: any) {
            this.logger.error(`Failed to anchor batch ${batchId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if a batch is verified on-chain
     */
    async isBatchVerified(batchId: string): Promise<boolean> {
        if (!this.enabled || !this.contract) {
            return false;
        }

        try {
            const batchIdBytes32 = toBytes32(batchId);
            return await this.contract.isBatchVerified(batchIdBytes32);
        } catch (error: any) {
            this.logger.error(`Failed to check batch verification: ${error.message}`);
            return false;
        }
    }
}
