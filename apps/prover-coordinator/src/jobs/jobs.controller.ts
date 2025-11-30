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
}
