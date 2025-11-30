import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
    private readonly logger = new Logger(GatewayService.name);

    constructor(@Inject(HttpService) private readonly httpService: HttpService) { }

    async proxyRequest(service: string, method: string, path: string, data?: any, headers?: Record<string, string>) {
        const baseUrl = this.getServiceUrl(service);
        const url = `${baseUrl}${path}`;

        this.logger.log(`Proxying ${method} ${url}`);

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    method,
                    url,
                    data,
                    headers: headers ? { ...headers } : undefined
                })
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Proxy failed: ${error.message}`);
            throw error;
        }
    }

    private getServiceUrl(service: string): string {
        switch (service) {
            case 'ledger': return 'http://localhost:3000';
            case 'credential': return 'http://localhost:3004';
            case 'identity': return 'http://localhost:3007';
            case 'startup': return 'http://localhost:3008';
            case 'investor': return 'http://localhost:3009';
            default: throw new Error(`Unknown service: ${service}`);
        }
    }
}
