import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) { }

    @Post()
    create(@Body() createJobDto: CreateJobDto) {
        return this.jobsService.createJob(createJobDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.jobsService.getJob(id);
    }

    @Get()
    findAll(@Query('limit') limit: number, @Query('offset') offset: number) {
        return this.jobsService.listJobs(limit, offset);
    }

    @Post('requeue-pending')
    requeuePending() {
        return this.jobsService.requeuePendingJobs();
    }

    /**
     * Get jobs from the dead letter queue
     */
    @Get('dlq/list')
    getDeadLetterJobs(@Query('limit') limit?: number) {
        return this.jobsService.getDeadLetterJobs(limit || 10);
    }

    /**
     * Reprocess a specific job from the dead letter queue
     */
    @Post('dlq/:jobId/reprocess')
    reprocessDeadLetterJob(@Param('jobId') jobId: string) {
        return this.jobsService.reprocessDeadLetterJob(jobId);
    }

    /**
     * Reprocess all jobs in the dead letter queue
     */
    @Post('dlq/reprocess-all')
    reprocessAllDeadLetterJobs() {
        return this.jobsService.reprocessAllDeadLetterJobs();
    }

    /**
     * Get failed jobs from the database
     */
    @Get('failed')
    getFailedJobs(@Query('limit') limit?: number) {
        return this.jobsService.getFailedJobs(limit || 10);
    }

    /**
     * Retry a failed job
     */
    @Post(':id/retry')
    retryJob(@Param('id') id: string) {
        return this.jobsService.retryFailedJob(id);
    }
}
