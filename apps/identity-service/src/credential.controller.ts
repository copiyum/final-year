import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CredentialService } from './credential.service';

@Controller('credentials')
export class CredentialController {
    constructor(private readonly credentialService: CredentialService) { }

    @Post('issue')
    issue(@Body('holders') holders: string[]) {
        return this.credentialService.issueCredentials(holders);
    }

    @Post('revoke')
    revoke(@Body('credentialIds') credentialIds: string[]) {
        return this.credentialService.revokeCredentials(credentialIds);
    }
}
