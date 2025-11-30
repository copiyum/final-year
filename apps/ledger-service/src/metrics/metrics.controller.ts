import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '@zkp-ledger/common';
import { Inject } from '@nestjs/common';

@Controller('metrics')
export class MetricsController {
    constructor(@Inject('METRICS_SERVICE') private metricsService: MetricsService) { }

    @Get()
    async getMetrics() {
        return await this.metricsService.getMetrics();
    }
}
