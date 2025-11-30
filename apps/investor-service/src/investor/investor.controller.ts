import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { InvestorService } from './investor.service';

@Controller('investor')
export class InvestorController {
    constructor(private readonly investorService: InvestorService) { }

    @Post('interests')
    async expressInterest(
        @Body('investorId') investorId: string,
        @Body('startupId') startupId: string,
    ) {
        return this.investorService.expressInterest(investorId, startupId);
    }

    @Get('interests')
    async getMyInterests(@Query('investorId') investorId: string) {
        return this.investorService.getMyInterests(investorId);
    }

    @Post('commitments')
    async makeCommitment(
        @Body('investorId') investorId: string,
        @Body('startupId') startupId: string,
        @Body('amount') amount: number,
        @Body('terms') terms?: string,
    ) {
        return this.investorService.makeCommitment(investorId, startupId, amount, terms);
    }

    @Get('commitments')
    async getMyCommitments(@Query('investorId') investorId: string) {
        return this.investorService.getMyCommitments(investorId);
    }

    @Get('commitments/:id/proof')
    async getCommitmentProof(
        @Param('id') id: string,
        @Query('investorId') investorId: string,
    ) {
        return this.investorService.getCommitmentProof(id, investorId);
    }

    @Post('access/request')
    async requestAccess(
        @Body('investorId') investorId: string,
        @Body('startupId') startupId: string,
    ) {
        return this.investorService.requestAccess(investorId, startupId);
    }

    @Get('startups')
    async getAccessibleStartups(@Query('investorId') investorId: string) {
        return this.investorService.getAccessibleStartups(investorId);
    }

    @Get('access/requests')
    async getMyAccessRequests(@Query('investorId') investorId: string) {
        return this.investorService.getMyAccessRequests(investorId);
    }
}
