import { NestFactory } from '@nestjs/core';
import { AggregatorModule } from './aggregator.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '../../.env'),
    path.join(__dirname, '../../../../.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Loading .env from ${envPath}`);
      dotenv.config({ path: envPath });
      break;
    }
  }
}

async function bootstrap() {
  loadEnv();

  // Validate required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'BLOCKCHAIN_RPC_URL'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please ensure .env file exists with all required variables');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AggregatorModule);
  
  // Handle graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  });

  console.log('Rollup Aggregator started');
}

bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
