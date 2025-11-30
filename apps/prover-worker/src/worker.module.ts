import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { QueueModule, QueueService } from '@zkp-ledger/queue';
import { StorageModule } from '@zkp-ledger/storage';
import { DatabaseModule } from '@zkp-ledger/database';
import { Pool } from 'pg';

console.log('WorkerModule file loading...');

@Module({
    imports: [
        QueueModule.register({
            redisUrl: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
            streamKey: 'prover_jobs',
            groupName: 'prover-workers',
        }),
        StorageModule.register({
            endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
            region: 'us-east-1',
            accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
            bucket: process.env.MINIO_BUCKET || 'proofs',
        }),
        DatabaseModule,
    ],
    providers: [
        {
            provide: WorkerService,
            useFactory: (queueService: QueueService, pool: Pool) => {
                console.log('WorkerService factory called');
                return new WorkerService(queueService, pool);
            },
            inject: [QueueService, 'DATABASE_POOL'],
        },
    ],
})
export class WorkerModule implements OnModuleInit {
    private readonly logger = new Logger(WorkerModule.name);
    
    constructor() {
        console.log('WorkerModule constructor');
    }
    
    onModuleInit() {
        console.log('WorkerModule onModuleInit');
        this.logger.log('WorkerModule initialized');
    }
}
