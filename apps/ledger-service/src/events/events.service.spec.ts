import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

describe('EventsService Properties', () => {
    let service: EventsService;
    let mockPool: any;

    beforeEach(async () => {
        mockPool = {
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                {
                    provide: 'DATABASE_POOL',
                    useValue: mockPool,
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    // Property 1: Valid event persistence
    it('should persist valid events with status none (Property 1)', async () => {
        const event: CreateEventDto = {
            type: 'transfer',
            payload: { amount: 100 },
            signer: 'alice',
            signature: 'sig',
        };

        mockPool.query.mockResolvedValue({
            rows: [{ id: 'uuid-1', created_at: new Date() }],
        });

        const result = await service.create(event);

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO events'),
            expect.arrayContaining([
                event.type,
                JSON.stringify(event.payload),
                null, // commitments
                null, // nullifiers
                event.signer,
                event.signature,
            ])
        );
        expect(result.id).toBe('uuid-1');
    });

    // Property 2: Event field storage
    it('should store commitments and nullifiers when present (Property 2)', async () => {
        const event: CreateEventDto = {
            type: 'mint',
            payload: { amount: 50 },
            commitments: { c1: 'val1' },
            nullifiers: { n1: 'val2' },
            signer: 'bob',
            signature: 'sig2',
        };

        mockPool.query.mockResolvedValue({
            rows: [{ id: 'uuid-2', created_at: new Date() }],
        });

        await service.create(event);

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO events'),
            expect.arrayContaining([
                JSON.stringify(event.commitments),
                JSON.stringify(event.nullifiers),
            ])
        );
    });

    // Property 4: Event submission response
    it('should return event ID and confirmation (Property 4)', async () => {
        const event: CreateEventDto = {
            type: 'transfer',
            payload: {},
            signer: 'alice',
            signature: 'sig',
        };

        const mockDate = new Date();
        mockPool.query.mockResolvedValue({
            rows: [{ id: 'uuid-3', created_at: mockDate }],
        });

        const result = await service.create(event);

        expect(result).toEqual({
            id: 'uuid-3',
            created_at: mockDate,
        });
    });
    // Property 29: Merkle path computation
    it('should generate valid inclusion proof for batched event (Property 29)', async () => {
        const eventId = 'e1';
        const batchId = 'b1';
        const eventIds = ['e1', 'e2'];

        // Mock batch query
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: batchId, event_ids: eventIds, poststate_root: 'root' }]
        });

        // Mock events query
        mockPool.query.mockResolvedValueOnce({
            rows: [
                { id: 'e1', type: 't1', payload: {}, signer: 's1', signature: 'sig1' },
                { id: 'e2', type: 't2', payload: {}, signer: 's2', signature: 'sig2' }
            ]
        });

        const result = await service.getInclusionProof(eventId);

        expect(result).toEqual(expect.objectContaining({
            status: 'included',
            batch_id: batchId,
            event_index: 0
        }));
        expect(result.merkle_path).toBeDefined();
        expect(result.merkle_path.siblings).toHaveLength(1); // 2 leaves -> depth 1
    });

    // Property 30: Inclusion proof completeness
    it('should return pending status for unbatched event (Property 30)', async () => {
        const eventId = 'e3';

        // Mock batch query (empty)
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        // Mock event query (exists)
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: eventId }] });

        const result = await service.getInclusionProof(eventId);

        expect(result).toEqual({
            status: 'pending',
            reason: 'Event not yet batched'
        });
    });
});

