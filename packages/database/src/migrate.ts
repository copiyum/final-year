import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations(client: Client, migrationsDir: string) {
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
        if (file.endsWith('.sql')) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query(sql);
        }
    }
}

if (import.meta.main) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/zkp_ledger',
    });

    await client.connect();
    try {
        await runMigrations(client, path.join(import.meta.dir, '../migrations'));
        console.log('Migrations completed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}
