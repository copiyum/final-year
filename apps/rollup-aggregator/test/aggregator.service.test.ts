import { Test, TestingModule } from '@nestjs/testing';
import { AggregatorService } from '../src/aggregator.service';
import { DatabaseModule } from '@zkp-ledger/database';
import { Pool } from 'pg';

describe('AggregatorService Properties', () => {
    let service: AggregatorService;
    let pool: Pool;

    const mockPool = {
        query: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AggregatorService,
                { provide: 'DATABASE_POOL', useValue: mockPool },
            ],
        }).compile();

        service = module.get<AggregatorService>(AggregatorService);
        pool = module.get<Pool>('DATABASE_POOL');
        jest.clearAllMocks();
    });

    // Property 19: Batch creation triggers
    it('should create a batch when pending events exist (Property 19)', async () => {
        // Mock pending events
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 'e1', type: 'transfer', payload: {} }] }) // events
            .mockResolvedValueOnce({ rows: [{ poststate_root: '0x0' }] }) // latest batch
            .mockResolvedValueOnce({ rows: [] }) // insert batch
            .mockResolvedValueOnce({ rows: [] }) // update events
            .mockResolvedValueOnce({ rows: [] }) // insert job
            .mockResolvedValueOnce({ rows: [] }); // update batch

        await service.processPendingEvents();

        // Verify batch insertion
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO batches'),
            expect.arrayContaining(['0x0']) // prestate root
        );
    });

    // Property 22: Batch proof request
    it('should create a proof job for the new batch (Property 22)', async () => {
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 'e1', type: 'transfer', payload: {} }] }) // events
            .mockResolvedValueOnce({ rows: [{ poststate_root: '0x0' }] }) // latest batch
            .mockResolvedValueOnce({ rows: [] }) // insert batch
            .mockResolvedValueOnce({ rows: [] }) // update events
            .mockResolvedValueOnce({ rows: [] }) // insert job
            .mockResolvedValueOnce({ rows: [] }); // update batch

        await service.processPendingEvents();

        // Verify job insertion
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO prover_jobs"),
            expect.any(Array)
        );

        // Also verify the SQL contains the hardcoded values
        const calls = mockPool.query.mock.calls;
        const insertJobCall = calls.find(call => call[0].includes('INSERT INTO prover_jobs'));
        expect(insertJobCall[0]).toContain("'batch'");
        expect(insertJobCall[0]).toContain("'rollup-circuit'");
    });
});
