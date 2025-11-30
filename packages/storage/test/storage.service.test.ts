import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../src/storage.service';
import { StorageModule } from '../src/storage.module';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

describe('StorageService Properties', () => {
    let service: StorageService;
    const s3Mock = mockClient(S3Client);

    beforeEach(async () => {
        s3Mock.reset();

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                StorageModule.register({
                    endpoint: 'http://localhost:9000',
                    region: 'us-east-1',
                    accessKeyId: 'minioadmin',
                    secretAccessKey: 'minioadmin',
                    bucket: 'test-bucket',
                }),
            ],
        }).compile();

        service = module.get<StorageService>(StorageService);
    });

    // Property 15: File upload
    it('should upload file to S3 bucket (Property 15)', async () => {
        s3Mock.on(PutObjectCommand).resolves({});

        const key = 'test-file.txt';
        const body = Buffer.from('hello world');

        await service.uploadFile(key, body);

        const calls = s3Mock.commandCalls(PutObjectCommand);
        expect(calls.length).toBe(1);
        expect(calls[0].args[0].input).toEqual(expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
            Body: body,
        }));
    });

    // Property 16: File deletion
    it('should delete file from S3 bucket (Property 16)', async () => {
        s3Mock.on(DeleteObjectCommand).resolves({});

        const key = 'test-file.txt';
        await service.deleteFile(key);

        const calls = s3Mock.commandCalls(DeleteObjectCommand);
        expect(calls.length).toBe(1);
        expect(calls[0].args[0].input).toEqual(expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
        }));
    });
});
