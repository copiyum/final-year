import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { BlocksModule } from './blocks/blocks.module';
import { BatchesModule } from './batches/batches.module';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from '@zkp-ledger/common';

@Module({
  imports: [EventsModule, BlocksModule, BatchesModule],
  controllers: [MetricsController],
  providers: [
    {
      provide: 'METRICS_SERVICE',
      useFactory: () => new MetricsService('ledger-service')
    }
  ],
})
export class AppModule { }

