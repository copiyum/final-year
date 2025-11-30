import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from '@zkp-ledger/queue';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule.register({
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      streamKey: 'prover_jobs',
      groupName: 'prover_workers',
    }),
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
