import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { DatabaseModule } from '@zkp-ledger/database';

@Module({
    imports: [DatabaseModule],
    controllers: [BlocksController],
    providers: [BlocksService],
})
export class BlocksModule { }
