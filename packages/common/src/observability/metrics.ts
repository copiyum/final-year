import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsService {
    private registry: Registry;

    // Common metrics
    public httpRequestDuration: Histogram;
    public httpRequestTotal: Counter;
    public activeConnections: Gauge;

    constructor(serviceName: string) {
        this.registry = new Registry();
        this.registry.setDefaultLabels({ service: serviceName });

        // HTTP request duration histogram
        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5],
            registers: [this.registry]
        });

        // HTTP request counter
        this.httpRequestTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry]
        });

        // Active connections gauge
        this.activeConnections = new Gauge({
            name: 'active_connections',
            help: 'Number of active connections',
            registers: [this.registry]
        });
    }

    createCounter(name: string, help: string, labelNames?: string[]) {
        return new Counter({
            name,
            help,
            labelNames,
            registers: [this.registry]
        });
    }

    createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]) {
        return new Histogram({
            name,
            help,
            labelNames,
            buckets,
            registers: [this.registry]
        });
    }

    createGauge(name: string, help: string, labelNames?: string[]) {
        return new Gauge({
            name,
            help,
            labelNames,
            registers: [this.registry]
        });
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    getRegistry(): Registry {
        return this.registry;
    }
}
