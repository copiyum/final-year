import { Module, type DynamicModule, Global } from '@nestjs/common';
import { StorageService, type StorageConfig } from './storage.service.js';

@Global()
@Module({})
export class StorageModule {
    static register(config: StorageConfig): DynamicModule {
        return {
            module: StorageModule,
            providers: [
                {
                    provide: 'STORAGE_CONFIG',
                    useValue: config,
                },
                StorageService,
            ],
            exports: [StorageService],
        };
    }
}
