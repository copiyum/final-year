import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { QueueService } from '@zkp-ledger/queue';

describe('JobsService Properties', () => {
    let service: JobsService;
    let mockPool: any;
    let mockQueue: any;

    beforeEach(async () => {
        mockPool = {
            query: jest.fn(),
        };
        mockQueue = {
            addJob: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JobsService,
                {
                    provide: 'DATABASE_POOL',
                    useValue: mockPool,
                },
                {
                    provide: QueueService,
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<JobsService>(JobsService);
    });

    // Property 11: Proof job creation
    it('should create and enqueue valid job (Property 11)', async () => {
        const dto = {
            target_type: 'event' as const,
            target_id: 'event-123',
            circuit: 'circuit-v1',
            witness_data: { a: 1 },
        };

        // Mock target check
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'event-123' }] });
        // Mock duplicate check
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Mock insert
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'job-1', ...dto }] });
        // Mock queue
        mockQueue.addJob.mockResolvedValue('msg-id');

        const result = await service.createJob(dto);

        expect(result.id).toBe('job-1');
        expect(mockQueue.addJob).toHaveBeenCalledWith(expect.objectContaining({
            id: 'job-1',
            payload: expect.objectContaining({
                circuit: dto.circuit,
            }),
        }));
    });

    // Property 13: Non-existent target rejection
    it('should reject job for non-existent target (Property 13)', async () => {
        const dto = {
            target_type: 'event' as const,
            target_id: 'missing-event',
            circuit: 'circuit-v1',
            witness_data: {},
        };

        // Mock target check (empty)
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await expect(service.createJob(dto)).rejects.toThrow('not found');
        expect(mockQueue.addJob).not.toHaveBeenCalled();
    });

    // Property 14: Duplicate job prevention
    it('should return existing job if duplicate exists (Property 14)', async () => {
        const dto = {
            target_type: 'event' as const,
            target_id: 'event-123',
            circuit: 'circuit-v1',
            witness_data: {},
        };

        // Mock target check
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'event-123' }] });
        // Mock duplicate check (found existing)
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-job', status: 'pending' }] });

        const result = await service.createJob(dto);

        expect(result.id).toBe('existing-job');
        expect(mockQueue.addJob).not.toHaveBeenCalled();
        // Should not insert
        expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should retrieve job by ID', async () => {
        const job = { id: 'job-1', status: 'pending' };
        mockPool.query.mockResolvedValueOnce({ rows: [job] });

        const result = await service.getJob('job-1');
        expect(result).toEqual(job);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM prover_jobs'), ['job-1']);
    });

    it('should list jobs with pagination', async () => {
        const jobs = [{ id: 'job-1' }, { id: 'job-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: jobs });

        const result = await service.listJobs(10, 0);
        expect(result).toEqual(jobs);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY created_at DESC LIMIT $1 OFFSET $2'),
            [10, 0]
        );
    });
});
