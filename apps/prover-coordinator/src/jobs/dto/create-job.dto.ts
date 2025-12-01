export class CreateJobDto {
    target_type: 'event' | 'batch' | 'verification_request';
    target_id: string;
    circuit: string;
    witness_data: Record<string, any>;
    priority?: number;
}
