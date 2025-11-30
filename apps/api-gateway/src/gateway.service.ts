import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface ServiceConfig {
    url: string;
    healthEndpoint?: string;
}

@Injectable()
export class GatewayService implements OnModuleInit {
    private readonly logger = new Logger(GatewayService.name);
    private readonly serviceUrls: Map<string, ServiceConfig> = new Map();
    private readonly maxRetries = 3;
    private readonly retryDelayMs = 1000;

    constructor(@Inject(HttpService) private readonly httpService: HttpService) { }

    onModuleInit() {
        // Load service URLs from environment variables with fallbacks
        this.serviceUrls.set('ledger', {
            url: process.env.LEDGER_SERVICE_URL || 'http://localhost:3000',
            healthEndpoint: '/health'
        });
        this.serviceUrls.set('credential', {
            url: process.env.CREDENTIAL_ISSUER_URL || 'http://localhost:3004',
            healthEndpoint: '/health'
        });
        this.serviceUrls.set('identity', {
            url: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3007',
            healthEndpoint: '/health'
        });
        this.serviceUrls.set('startup', {
            url: process.env.STARTUP_SERVICE_URL || 'http://localhost:3008',
            healthEndpoint: '/health'
        });
        this.serviceUrls.set('investor', {
            url: process.env.INVESTOR_SERVICE_URL || 'http://localhost:3009',
            healthEndpoint: '/health'
        });
        this.serviceUrls.set('prover', {
            url: process.env.PROVER_COORDINATOR_URL || 'http://localhost:3001',
            healthEndpoint: '/health'
        });

        this.logger.log('Service URLs configured:');
        this.serviceUrls.forEach((config, name) => {
            this.logger.log(`  ${name}: ${config.url}`);
        });
    }

    async proxyRequest(service: string, method: string, path: string, data?: any, headers?: Record<string, string>) {
        const baseUrl = this.getServiceUrl(service);
        const url = `${baseUrl}${path}`;

        this.logger.log(`Proxying ${method} ${url}`);

        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await firstValueFrom(
                    this.httpService.request({
                        method,
                        url,
                        data,
                        headers: headers ? { ...headers } : undefined,
                        timeout: 30000, // 30 second timeout
                    })
                );
                return response.data;
            } catch (error) {
                lastError = error as Error;
                const axiosError = error as AxiosError;
                
                // Don't retry on client errors (4xx)
                if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
                    this.logger.error(`Proxy failed with client error: ${axiosError.message}`);
                    throw error;
                }
                
                if (attempt < this.maxRetries) {
                    this.logger.warn(`Proxy attempt ${attempt} failed, retrying in ${this.retryDelayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempt));
                }
            }
        }

        this.logger.error(`Proxy failed after ${this.maxRetries} attempts: ${lastError?.message}`);
        throw lastError;
    }

    private getServiceUrl(service: string): string {
        const config = this.serviceUrls.get(service);
        if (!config) {
            throw new Error(`Unknown service: ${service}. Available services: ${Array.from(this.serviceUrls.keys()).join(', ')}`);
        }
        return config.url;
    }

    /**
     * Check health of all registered services
     */
    async checkServicesHealth(): Promise<Record<string, { healthy: boolean; latencyMs?: number; error?: string }>> {
        const results: Record<string, { healthy: boolean; latencyMs?: number; error?: string }> = {};

        for (const [name, config] of this.serviceUrls) {
            const start = Date.now();
            try {
                await firstValueFrom(
                    this.httpService.get(`${config.url}${config.healthEndpoint || '/health'}`, {
                        timeout: 5000
                    })
                );
                results[name] = { healthy: true, latencyMs: Date.now() - start };
            } catch (error: any) {
                results[name] = { healthy: false, error: error.message };
            }
        }

        return results;
    }
}
