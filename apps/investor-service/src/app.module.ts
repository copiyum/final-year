import { Module } from '@nestjs/common';
import { DatabaseModule } from '@zkp-ledger/database';
import { HttpModule } from '@nestjs/axios';
import { InvestorService } from './investor/investor.service';
import { InvestorController } from './investor/investor.controller';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [InvestorController],
  providers: [InvestorService],
})
export class AppModule { }
