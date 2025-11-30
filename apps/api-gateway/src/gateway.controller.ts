import { Controller, All, Get, Req, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles, Public } from './auth/roles.decorator';
import type { Request } from 'express';

@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GatewayController {
    constructor(private readonly gatewayService: GatewayService) { }

    // ============ AUTH ROUTES (Public) ============
    @All('auth/*')
    @Public()
    async proxyAuth(@Req() req: Request, @Body() body: any) {
        const path = req.url.replace('/api', '');
        return this.gatewayService.proxyRequest('identity', req.method, path, body);
    }

    // ============ PUBLIC VERIFICATION ============
    @Get('verify/batch/:batchId')
    @Public()
    async getPublicBatchVerification(@Param('batchId') batchId: string) {
        // Fetch batch from ledger service
        const batch = await this.gatewayService.proxyRequest('ledger', 'GET', `/verify/batch/${batchId}`);
        
        return {
            valid: batch?.proof?.status === 'verified',
            batchId: batch?.id,
            root: batch?.batch_root,
            status: batch?.proof?.status || batch?.status,
            proof: batch?.proof || null,
            eventCount: batch?.event_count || 0,
            createdAt: batch?.created_at,
            anchoredAt: batch?.anchored_at
        };
    }

    // ============ EVENTS ROUTES ============
    @All('events')
    @Public()
    async proxyEventsRoot(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('ledger', req.method, path, body, headers);
    }

    @All('events/*')
    @Public()
    async proxyEvents(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('ledger', req.method, path, body, headers);
    }

    // ============ CREDENTIALS ROUTES ============
    @All('credentials')
    async proxyCredentialsRoot(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('credential', req.method, path, body, headers);
    }

    @All('credentials/*')
    async proxyCredentials(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('credential', req.method, path, body, headers);
    }

    // ============ STARTUP SERVICE ROUTES (Both roles - service handles fine-grained access) ============
    @All('startups')
    @Roles('founder', 'investor')
    async proxyStartupsRoot(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('startup', req.method, path, body, headers);
    }

    @All('startups/*')
    @Roles('founder', 'investor')
    async proxyStartups(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('startup', req.method, path, body, headers);
    }

    // ============ INVESTOR SERVICE ROUTES (Investor only) ============
    @All('investor')
    @Roles('investor')
    async proxyInvestorRoot(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('investor', req.method, path, body, headers);
    }

    @All('investor/*')
    @Roles('investor')
    async proxyInvestor(@Req() req: Request, @Body() body: any, @Headers('authorization') auth: string) {
        const path = req.url.replace('/api', '');
        const headers = auth ? { Authorization: auth } : undefined;
        return this.gatewayService.proxyRequest('investor', req.method, path, body, headers);
    }
}
