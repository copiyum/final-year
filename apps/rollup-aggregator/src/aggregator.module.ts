import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AggregatorService } from './aggregator.service';
import { AnchorService } from './anchor.service';
import { DatabaseModule } from '@zkp-ledger/database';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        DatabaseModule,
        HttpModule,
    ],
    providers: [AggregatorService, AnchorService],
})
export class AggregatorModule { }
