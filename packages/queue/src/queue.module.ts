import { Module, type DynamicModule, Global } from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Global()
@Module({})
export class QueueModule {
    static register(options: { redisUrl: string; streamKey: string; groupName: string }): DynamicModule {
        console.log('QueueModule.register called with:', options);
        return {
            module: QueueModule,
            providers: [
                {
                    provide: 'QUEUE_OPTIONS',
                    useValue: options,
                },
                {
                    provide: QueueService,
                    useFactory: async (opts: typeof options) => {
                        console.log('QueueService factory starting...');
                        const service = new QueueService(opts.redisUrl, opts.streamKey, opts.groupName);
                        console.log('QueueService created');
                        // Do NOT await onModuleInit here - let NestJS handle it
                        // await service.onModuleInit(); 
                        return service;
                        return service;
                    },
                    inject: ['QUEUE_OPTIONS'],
                },
            ],
            exports: [QueueService],
        };
    }
}
