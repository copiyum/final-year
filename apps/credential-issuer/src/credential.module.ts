import { Module } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { DatabaseModule } from '@zkp-ledger/database';

@Module({
    imports: [DatabaseModule],
    controllers: [CredentialController],
    providers: [CredentialService],
})
export class CredentialModule { }
