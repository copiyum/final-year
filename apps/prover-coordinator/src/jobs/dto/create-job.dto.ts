export class CreateJobDto {
    target_type: 'event' | 'batch';
    target_id: string;
    circuit: string;
    witness_data: Record<string, any>;
    priority?: number;
}
