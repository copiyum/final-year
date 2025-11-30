import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { DatabaseModule } from '@zkp-ledger/database';

@Module({
    imports: [DatabaseModule],
    controllers: [EventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule { }
