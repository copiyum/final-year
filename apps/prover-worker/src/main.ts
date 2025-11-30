import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  // Load .env from workspace root if not already loaded
  if (!process.env.REDIS_HOST) {
    const fs = await import('fs');
    const path = await import('path');
    // Try to find .env in likely locations
    const searchPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '../../.env'),
      path.join(__dirname, '../../../../.env')
    ];

    for (const envPath of searchPaths) {
      if (fs.existsSync(envPath)) {
        console.log(`Loading .env from ${envPath}`);
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
        break;
      }
    }
  }

  console.log('Creating application context...');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('Application context created');
  console.log('Prover Worker started');
}
bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
