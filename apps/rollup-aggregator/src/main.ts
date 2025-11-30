import { NestFactory } from '@nestjs/core';
import { AggregatorModule } from './aggregator.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Load .env from workspace root if not already loaded
  if (!process.env.BLOCKCHAIN_RPC_URL) {
    // Find workspace root by looking for package.json with workspaces
    let dir = process.cwd();
    while (dir !== '/') {
      const envPath = path.join(dir, '.env');
      if (fs.existsSync(envPath)) {
        console.log(`Loading .env from ${envPath}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            if (key && value && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
        break;
      }
      dir = path.dirname(dir);
    }
  }

  const app = await NestFactory.createApplicationContext(AggregatorModule);
  console.log('Rollup Aggregator started');
}
bootstrap();
