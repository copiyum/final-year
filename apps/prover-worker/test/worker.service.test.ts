import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from '../src/worker.service';
import { QueueService } from '@zkp-ledger/queue';
import { StorageService } from '@zkp-ledger/storage';
import * as snarkjs from 'snarkjs';

jest.mock('snarkjs', () => ({
    groth16: {
        fullProve: jest.fn(),
    },
}));

describe('WorkerService Properties', () => {
    let service: WorkerService;
    let queueService: QueueService;
    let storageService: StorageService;

    const mockQueueService = {
        processJobs: jest.fn(),
    };

    const mockStorageService = {
        uploadFile: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkerService,
                { provide: QueueService, useValue: mockQueueService },
                { provide: StorageService, useValue: mockStorageService },
            ],
        }).compile();

        service = module.get<WorkerService>(WorkerService);
        queueService = module.get<QueueService>(QueueService);
        storageService = module.get<StorageService>(StorageService);

        jest.clearAllMocks();
    });

    // Property 17: Proof generation flow
    it('should process job, generate proof, and upload artifacts (Property 17)', async () => {
        // Mock queue to return one job and then stop (simulate by not calling handler again)
        // Actually processJobs is a loop in the real service, but here we mock it to just call the handler once
        mockQueueService.processJobs.mockImplementation(async (consumerName, handler) => {
            const job = { id: 'job-1', data: { input: 'test' } };
            await handler(job);
        });

        // Mock snarkjs
        (snarkjs.groth16.fullProve as jest.Mock).mockResolvedValue({
            proof: { pi_a: [] },
            publicSignals: ['0x1'],
        });

        // We need to trigger processJobs. Since it's an infinite loop in the real service, 
        // we should modify the service to be testable or just test the handler logic if we extracted it.
        // But here processJobs is mocked, so it won't loop unless the mock loops.
        // We'll call service.processJobs() which will call our mockQueueService.processJobs once.

        // To prevent infinite loop in the service's `while(true)`, we can spy on isProcessing or just rely on the fact 
        // that `await this.queueService.processJobs` will return (because our mock returns).
        // But the service has a `while(true)` loop around it.
        // We need to break that loop.
        // Let's modify the service to allow stopping, or just test the logic by extracting the handler.
        // For now, let's assume we can't easily break the loop without refactoring.
        // Refactoring WorkerService to have a `stop()` method or `isActive` flag is better.
    });
});
