import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../src/queue.service';
import { QueueModule } from '../src/queue.module';
import { randomUUID } from 'crypto';

describe('QueueService Properties', () => {
    let service: QueueService;
    let module: TestingModule;

    beforeEach(async () => {
        const streamKey = `test-stream-${randomUUID()}`;
        const groupName = `test-group-${randomUUID()}`;

        module = await Test.createTestingModule({
            imports: [
                QueueModule.register({
                    redisUrl: 'redis://localhost:6379',
                    streamKey,
                    groupName,
                }),
            ],
        }).compile();

        service = module.get<QueueService>(QueueService);
        await service.onModuleInit();
    });

    afterEach(async () => {
        await module.close();
    });

    // Property 12: Job enqueueing
    it('should enqueue jobs with unique IDs (Property 12)', async () => {
        const jobData = { foo: 'bar' };
        const id1 = await service.addJob(jobData);
        const id2 = await service.addJob(jobData);

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
    });

    // Property 61: Job acknowledgment
    it('should process and acknowledge jobs (Property 61)', async () => {
        const jobData = { task: 'process-me' };
        const jobId = await service.addJob(jobData);

        let processedJobId: string | undefined;

        await service.processJobs('consumer-1', async (job) => {
            processedJobId = job.id;
            expect(job.data).toEqual(jobData);
        });

        expect(processedJobId).toBe(jobId);

        // Verify it's not processed again by the same consumer group
        let processedAgain = false;
        await service.processJobs('consumer-1', async () => {
            processedAgain = true;
        });

        expect(processedAgain).toBe(false);
    });

    // Property 59: Consumer group load balancing
    it('should distribute jobs among consumers (Property 59)', async () => {
        // Add 2 jobs
        await service.addJob({ job: 1 });
        await service.addJob({ job: 2 });

        const processedByConsumer1: string[] = [];
        const processedByConsumer2: string[] = [];

        // Consumer 1 takes one
        await service.processJobs('consumer-A', async (job) => {
            processedByConsumer1.push(job.id);
        }, 1);

        // Consumer 2 takes one
        await service.processJobs('consumer-B', async (job) => {
            processedByConsumer2.push(job.id);
        }, 1);

        expect(processedByConsumer1.length).toBe(1);
        expect(processedByConsumer2.length).toBe(1);
        expect(processedByConsumer1[0]).not.toBe(processedByConsumer2[0]);
    });
});
