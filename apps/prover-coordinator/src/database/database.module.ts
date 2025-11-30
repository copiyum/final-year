import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

@Global()
@Module({
    providers: [
        {
            provide: 'DATABASE_POOL',
            useFactory: () => {
                return new Pool({
                    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/zkp_ledger',
                });
            },
        },
    ],
    exports: ['DATABASE_POOL'],
})
export class DatabaseModule { }
