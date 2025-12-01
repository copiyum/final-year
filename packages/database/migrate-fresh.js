import { Pool } from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/zkp_ledger'
});

async function runFreshMigration() {
    const client = await pool.connect();

    try {
        console.log('Running complete schema migration...');

        const migrationPath = join(__dirname, 'migrations', '000_complete_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(sql);
        
        console.log('✅ Complete schema migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runFreshMigration();
