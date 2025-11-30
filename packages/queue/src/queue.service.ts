import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface Job<T> {
    id: string;
    data: T;
    retryCount?: number;
}

export interface QueueConfig {
    maxRetries?: number;
    retryDelayMs?: number;
    deadLetterQueueKey?: string;
}

const DEFAULT_CONFIG: QueueConfig = {
    maxRetries: 3,
    retryDelayMs: 5000,
    deadLetterQueueKey: 'dead-letter-queue',
};

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
    private redis: Redis;
    private streamKey: string;
    private groupName: string;
    private config: QueueConfig;

    constructor(redisUrl: string, streamKey: string, groupName: string, config?: QueueConfig) {
        this.redis = new Redis(redisUrl);
        this.streamKey = streamKey;
        this.groupName = groupName;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    async onModuleInit() {
        try {
            // Add timeout to prevent hanging indefinitely if Redis is unreachable
            const createGroupPromise = this.redis.xgroup('CREATE', this.streamKey, this.groupName, '0', 'MKSTREAM');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Redis connection timed out during xgroup CREATE')), 5000)
            );

            await Promise.race([createGroupPromise, timeoutPromise]);
            
            // Also create dead letter queue stream
            const dlqKey = `${this.streamKey}:${this.config.deadLetterQueueKey}`;
            await this.redis.xgroup('CREATE', dlqKey, `${this.groupName}-dlq`, '0', 'MKSTREAM').catch(() => {});
        } catch (err: any) {
            if (err.message && err.message.includes('BUSYGROUP')) {
                // Group already exists, which is fine
                return;
            }
            console.warn(`QueueService warning: ${err.message}`);
            // Don't throw, just log warning so app can start even if Redis is temporarily down
        }
    }

    async addJob<T>(data: T): Promise<string> {
        const jobData = { ...data, retryCount: 0 };
        const id = await this.redis.xadd(this.streamKey, '*', 'data', JSON.stringify(jobData));
        return id as string;
    }

    /**
     * Move a failed job to the dead letter queue for manual inspection
     */
    private async moveToDeadLetterQueue<T>(job: Job<T>, error: Error): Promise<void> {
        const dlqKey = `${this.streamKey}:${this.config.deadLetterQueueKey}`;
        const dlqData = {
            originalId: job.id,
            data: job.data,
            error: error.message,
            failedAt: new Date().toISOString(),
            retryCount: job.retryCount || 0,
        };
        
        await this.redis.xadd(dlqKey, '*', 'data', JSON.stringify(dlqData));
        console.log(`Job ${job.id} moved to dead letter queue after ${job.retryCount} retries`);
    }

    /**
     * Retry a failed job with exponential backoff
     */
    private async retryJob<T>(job: Job<T>): Promise<void> {
        const retryCount = (job.retryCount || 0) + 1;
        const delay = this.config.retryDelayMs! * Math.pow(2, retryCount - 1); // Exponential backoff
        
        console.log(`Scheduling retry ${retryCount}/${this.config.maxRetries} for job ${job.id} in ${delay}ms`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Re-add job with incremented retry count
        const retryData = { ...job.data, retryCount };
        await this.redis.xadd(this.streamKey, '*', 'data', JSON.stringify(retryData));
    }

    async processJobs<T>(
        consumerName: string,
        handler: (job: Job<T>) => Promise<void>,
        batchSize = 1
    ): Promise<void> {
        const results = await this.redis.xreadgroup(
            'GROUP',
            this.groupName,
            consumerName,
            'COUNT',
            batchSize,
            'BLOCK',
            2000,
            'STREAMS',
            this.streamKey,
            '>'
        );

        if (!results) return;

        for (const [stream, messages] of results as any) {
            for (const [id, fields] of messages) {
                // fields is ['data', '{"foo":"bar"}']
                const dataStr = fields[1];
                const parsedData = JSON.parse(dataStr);
                const retryCount = parsedData.retryCount || 0;
                
                // Remove retryCount from the data passed to handler
                const { retryCount: _, ...data } = parsedData;
                const job: Job<T> = { id, data: data as T, retryCount };

                try {
                    await handler(job);
                    await this.redis.xack(this.streamKey, this.groupName, id);
                } catch (err: any) {
                    console.error(`Failed to process job ${id} (attempt ${retryCount + 1}):`, err.message);
                    
                    // Acknowledge the failed message to prevent reprocessing
                    await this.redis.xack(this.streamKey, this.groupName, id);
                    
                    // Check if we should retry or move to dead letter queue
                    if (retryCount < this.config.maxRetries!) {
                        await this.retryJob({ id, data: data as T, retryCount });
                    } else {
                        await this.moveToDeadLetterQueue({ id, data: data as T, retryCount }, err);
                    }
                }
            }
        }
    }

    /**
     * Get jobs from the dead letter queue for inspection
     */
    async getDeadLetterJobs(count = 10): Promise<any[]> {
        const dlqKey = `${this.streamKey}:${this.config.deadLetterQueueKey}`;
        const results = await this.redis.xrange(dlqKey, '-', '+', 'COUNT', count);
        
        return results.map(([id, fields]) => ({
            id,
            data: JSON.parse(fields[1]),
        }));
    }

    /**
     * Reprocess a job from the dead letter queue
     */
    async reprocessDeadLetterJob(dlqJobId: string): Promise<string | null> {
        const dlqKey = `${this.streamKey}:${this.config.deadLetterQueueKey}`;
        const results = await this.redis.xrange(dlqKey, dlqJobId, dlqJobId);
        
        if (results.length === 0) return null;
        
        const [, fields] = results[0];
        const dlqData = JSON.parse(fields[1]);
        
        // Re-add to main queue with reset retry count
        const newId = await this.addJob(dlqData.data);
        
        // Remove from DLQ
        await this.redis.xdel(dlqKey, dlqJobId);
        
        return newId;
    }

    async onModuleDestroy() {
        await this.close();
    }

    async close() {
        await this.redis.quit();
    }
}
