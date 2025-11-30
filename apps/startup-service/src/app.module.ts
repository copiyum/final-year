import { Module } from '@nestjs/common';
import { DatabaseModule } from '@zkp-ledger/database';
import { HttpModule } from '@nestjs/axios';
import { StartupService } from './startup/startup.service';
import { StartupController } from './startup/startup.controller';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [StartupController],
  providers: [StartupService],
})
export class AppModule { }
