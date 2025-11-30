import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StartupService } from './startup.service';

@Controller('startups')
export class StartupController {
    constructor(private readonly startupService: StartupService) { }

    @Post()
    async create(@Body() dto: any, @Request() req) {
        // In production, use JWT guard to get founderId from token
        const founderId = req.body.founderId || req.body.founder_id || req.user?.id;
        return this.startupService.create(founderId, dto);
    }

    @Get()
    async findAll(@Query('userId') userId?: string, @Query('userRole') userRole?: string) {
        return this.startupService.findAll(userId, userRole);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Query('userId') userId?: string, @Query('userRole') userRole?: string) {
        return this.startupService.findOne(id, userId, userRole);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        const founderId = req.body.founderId || req.body.founder_id || req.user?.id;
        return this.startupService.update(id, founderId, dto);
    }

    @Post(':id/documents')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('documentType') documentType: string,
        @Body('founderId') founderId: string,
    ) {
        return this.startupService.uploadDocument(id, founderId, file, documentType);
    }

    @Get(':id/documents')
    async getDocuments(@Param('id') id: string) {
        return this.startupService.getDocuments(id);
    }

    @Post(':id/access/grant')
    async grantAccess(
        @Param('id') id: string,
        @Body('founderId') founderId: string,
        @Body('investorId') investorId: string,
    ) {
        return this.startupService.grantAccess(id, founderId, investorId);
    }

    @Post(':id/access/revoke')
    async revokeAccess(
        @Param('id') id: string,
        @Body('founderId') founderId: string,
        @Body('investorId') investorId: string,
    ) {
        return this.startupService.revokeAccess(id, founderId, investorId);
    }

    @Post(':id/metrics')
    async addMetric(
        @Param('id') id: string,
        @Body('founderId') founderId: string,
        @Body('metric_name') metricName: string,
        @Body('metric_value') metricValue: number,
        @Body('threshold') threshold?: number,
    ) {
        return this.startupService.addMetric(id, founderId, metricName, metricValue, threshold);
    }

    @Get(':id/metrics')
    async getMetrics(@Param('id') id: string) {
        return this.startupService.getMetrics(id);
    }

    @Get(':id/metrics/verify')
    async getVerificationStatus(@Param('id') id: string) {
        return this.startupService.getVerificationStatus(id);
    }

    @Get(':id/access/requests')
    async getAccessRequests(
        @Param('id') id: string,
        @Query('founderId') founderId: string,
    ) {
        return this.startupService.getAccessRequests(id, founderId);
    }

    @Post(':id/metrics/:metricId/retry-proof')
    async retryMetricProof(
        @Param('id') id: string,
        @Param('metricId') metricId: string,
        @Body('founderId') founderId: string,
    ) {
        return this.startupService.retryMetricProof(metricId, founderId);
    }
}
