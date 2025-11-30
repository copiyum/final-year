import { NestFactory } from '@nestjs/core';
import { CredentialModule } from './credential.module';

async function bootstrap() {
  const app = await NestFactory.create(CredentialModule);
  await app.listen(3004);
  console.log('Credential Issuer started on port 3004');
}
bootstrap();
