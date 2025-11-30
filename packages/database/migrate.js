import { Pool } from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/zkp_ledger'
});

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('Running database migrations...');

        const migrationsDir = join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const migrationPath = join(migrationsDir, file);
            const sql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(sql);
            console.log(`✅ ${file} completed`);
        }

        console.log('✅ All migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
