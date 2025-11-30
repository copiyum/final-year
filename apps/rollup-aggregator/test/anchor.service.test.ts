import { Test, TestingModule } from '@nestjs/testing';
import { AnchorService } from '../src/anchor.service';
import { ethers } from 'ethers';

// Mock ethers
// Mock ethers
jest.mock('ethers', () => {
    return {
        ethers: {
            JsonRpcProvider: jest.fn(),
            Wallet: jest.fn(),
            Contract: jest.fn(),
        },
    };
});

describe('AnchorService Properties', () => {
    let service: AnchorService;
    let mockContract: any;
    let mockProvider: any;
    let mockWallet: any;

    beforeEach(async () => {
        mockContract = {
            anchorBatch: jest.fn(),
        };
        mockProvider = {};
        mockWallet = {};

        (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);
        (ethers.Wallet as jest.Mock).mockReturnValue(mockWallet);
        (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnchorService],
        }).compile();

        service = module.get<AnchorService>(AnchorService);
    });

    // Property 24: Anchor submission
    it('should submit valid anchor transaction (Property 24)', async () => {
        const batchId = '0x123';
        const batchRoot = '0xabc';
        const prestateRoot = '0xdef';
        const poststateRoot = '0xabc';
        const proof = {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8']
        };
        const metadataURI = 'ipfs://test';

        const mockTx = {
            hash: '0xtxhash',
            wait: jest.fn().mockResolvedValue({
                blockNumber: 100,
                gasUsed: BigInt(50000)
            })
        };

        mockContract.anchorBatch.mockResolvedValue(mockTx);

        const result = await service.anchorBatch(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            proof,
            metadataURI
        );

        expect(mockContract.anchorBatch).toHaveBeenCalledWith(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            ['1', '2'],
            [['4', '3'], ['6', '5']], // Note the swap expectation
            ['7', '8'],
            metadataURI
        );

        expect(result).toEqual({
            txHash: '0xtxhash',
            blockNumber: 100,
            gasUsed: '50000'
        });
    });
});
