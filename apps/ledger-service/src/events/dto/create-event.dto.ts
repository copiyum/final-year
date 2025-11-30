export class CreateEventDto {
    type: string;
    payload: Record<string, any>;
    commitments?: Record<string, any>;
    nullifiers?: Record<string, any>;
    signer: string;
    signature: string;
}
