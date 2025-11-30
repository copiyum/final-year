import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    create(@Body() createEventDto: CreateEventDto) {
        return this.eventsService.create(createEventDto);
    }

    @Get()
    findAll(@Query() query: Record<string, any>) {
        return this.eventsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Get(':id/proof')
    getInclusionProof(@Param('id') id: string) {
        return this.eventsService.getInclusionProof(id);
    }

    /**
     * Backfill leaf hashes for existing events
     * This is a maintenance endpoint - run once after migration
     */
    @Post('maintenance/backfill-leaf-hashes')
    backfillLeafHashes() {
        return this.eventsService.backfillLeafHashes();
    }
}
