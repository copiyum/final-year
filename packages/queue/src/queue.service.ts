import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface Job<T> {
    id: string;
    data: T;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
    private redis: Redis;
    private streamKey: string;
    private groupName: string;

    constructor(redisUrl: string, streamKey: string, groupName: string) {
        this.redis = new Redis(redisUrl);
        this.streamKey = streamKey;
        this.groupName = groupName;
    }

    async onModuleInit() {
        try {
            // Add timeout to prevent hanging indefinitely if Redis is unreachable
            const createGroupPromise = this.redis.xgroup('CREATE', this.streamKey, this.groupName, '$', 'MKSTREAM');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Redis connection timed out during xgroup CREATE')), 5000)
            );

            await Promise.race([createGroupPromise, timeoutPromise]);
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
        const id = await this.redis.xadd(this.streamKey, '*', 'data', JSON.stringify(data));
        return id as string;
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
                const data = JSON.parse(dataStr);

                try {
                    await handler({ id, data });
                    await this.redis.xack(this.streamKey, this.groupName, id);
                } catch (err) {
                    console.error(`Failed to process job ${id}:`, err);
                    // TODO: Implement retry logic or dead letter queue
                }
            }
        }
    }

    async onModuleDestroy() {
        await this.close();
    }

    async close() {
        await this.redis.quit();
    }
}
