import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    bucket?: string;
}

export class StorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        // MinIO configuration (S3-compatible)
        this.s3Client = new S3Client({
            endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
            region: process.env.S3_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
                secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
            },
            forcePathStyle: true, // Required for MinIO
        });

        this.bucketName = process.env.S3_BUCKET || 'zkp-proofs';
    }

    async ensureBucket() {
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        } catch (error) {
            // Bucket doesn't exist, create it
            await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
            console.log(`Created bucket: ${this.bucketName}`);
        }
    }

    async uploadProof(key: string, proof: any): Promise<string> {
        await this.ensureBucket();

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: JSON.stringify(proof),
            ContentType: 'application/json',
        });

        await this.s3Client.send(command);
        return `s3://${this.bucketName}/${key}`;
    }

    async getProof(key: string): Promise<any> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        const response = await this.s3Client.send(command);
        const bodyString = await response.Body?.transformToString();
        return JSON.parse(bodyString || '{}');
    }

    async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return await getSignedUrl(this.s3Client, command, { expiresIn });
    }
}
