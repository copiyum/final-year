import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class Logger {
    private logger: winston.Logger;
    private correlationId: string;

    constructor(service: string, correlationId?: string) {
        this.correlationId = correlationId || uuidv4();

        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: {
                service,
                correlationId: this.correlationId
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    info(message: string, meta?: any) {
        this.logger.info(message, meta);
    }

    error(message: string, error?: Error, meta?: any) {
        this.logger.error(message, {
            ...meta,
            error: error?.message,
            stack: error?.stack
        });
    }

    warn(message: string, meta?: any) {
        this.logger.warn(message, meta);
    }

    debug(message: string, meta?: any) {
        this.logger.debug(message, meta);
    }

    getCorrelationId(): string {
        return this.correlationId;
    }
}
