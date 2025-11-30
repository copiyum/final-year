import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { BlocksService } from './blocks.service';

@Controller('blocks')
export class BlocksController {
    constructor(private readonly blocksService: BlocksService) { }

    @Post()
    create() {
        return this.blocksService.createBlock();
    }

    @Get('latest')
    getLatest() {
        return this.blocksService.getLatestBlock();
    }

    @Get('verify')
    verifyChain() {
        return this.blocksService.verifyChain();
    }

    @Get(':index')
    findOne(@Param('index', ParseIntPipe) index: number) {
        return this.blocksService.getBlock(index);
    }
}
