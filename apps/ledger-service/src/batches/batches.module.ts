import { Module } from '@nestjs/common';
import { DatabaseModule } from '@zkp-ledger/database';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
    imports: [DatabaseModule],
    controllers: [BatchesController],
    providers: [BatchesService],
    exports: [BatchesService],
})
export class BatchesModule { }
