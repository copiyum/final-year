import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BatchesService } from './batches.service';

@Controller('verify/batch')
export class BatchesController {
    constructor(private readonly batchesService: BatchesService) { }

    @Get(':id')
    async getBatch(@Param('id') id: string) {
        const batch = await this.batchesService.getBatchById(id);
        if (!batch) {
            throw new NotFoundException(`Batch ${id} not found`);
        }
        return batch;
    }
}
