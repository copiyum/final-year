import { Test, TestingModule } from '@nestjs/testing';
import { CredentialService } from '../src/credential.service';
import { Pool } from 'pg';

describe('CredentialService Properties', () => {
    let service: CredentialService;
    let mockPool: any;

    beforeEach(async () => {
        mockPool = {
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CredentialService,
                { provide: 'DATABASE_POOL', useValue: mockPool },
            ],
        }).compile();

        service = module.get<CredentialService>(CredentialService);
    });

    // Property 31: Credential issuance
    it('should issue credentials with valid Merkle paths (Property 31)', async () => {
        const holders = ['alice', 'bob'];

        mockPool.query.mockResolvedValue({ rows: [] });

        const result = await service.issueCredentials(holders);

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO credential_issuances'),
            expect.any(Array)
        );

        expect(result.credentials).toHaveLength(2);
        expect(result.credentials[0].holder).toBe('alice');
        expect(result.credentials[0].merkle_path).toBeDefined();
        expect(result.root).toBeDefined();
    });
});
