import { describe, it, expect } from 'bun:test';
import { canonicalHash, serializeCanonical, type Canonicalizable } from '../src/crypto/canonical';
import * as cbor from 'cbor';

describe('Canonical Serialization Properties', () => {
    // Property 5: Canonical block serialization
    it('should produce identical byte sequences for the same object (Property 5)', () => {
        const block: Canonicalizable = {
            format_version: '1.0',
            circuit_version: '1.0',
            index: 1,
            prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
            timestamp: '2023-01-01T00:00:00Z',
            events: ['uuid-1', 'uuid-2'],
            merkle_root: 'abcdef1234567890',
        };

        const bytes1 = serializeCanonical(block);
        const bytes2 = serializeCanonical({ ...block }); // Clone

        expect(bytes1).toEqual(bytes2);
        expect(bytes1.toString('hex')).toBe(bytes2.toString('hex'));
    });

    // Property 6: Block hash determinism
    it('should produce the same hash for the same object (Property 6)', () => {
        const block: Canonicalizable = {
            format_version: '1.0',
            circuit_version: '1.0',
            index: 1,
            prev_hash: 'hash1',
            data: 'some data',
        };

        const hash1 = canonicalHash(block);
        const hash2 = canonicalHash({ ...block });

        expect(hash1).toBe(hash2);
    });

    // Property 47: Field ordering determinism
    it('should be insensitive to key insertion order (Property 47)', () => {
        const obj1: Canonicalizable = {
            format_version: '1.0',
            circuit_version: '1.0',
            a: 1,
            b: 2,
        };

        const obj2: Canonicalizable = {
            b: 2,
            a: 1,
            format_version: '1.0',
            circuit_version: '1.0',
        };

        const hash1 = canonicalHash(obj1);
        const hash2 = canonicalHash(obj2);

        expect(hash1).toBe(hash2);

        const bytes1 = serializeCanonical(obj1);
        const bytes2 = serializeCanonical(obj2);
        expect(bytes1).toEqual(bytes2);
    });

    // Property 9: Block serialization completeness & UTF-8 NFC
    it('should normalize strings to NFC (Property 9)', () => {
        const strNFC = 'café';
        const strNFD = 'cafe\u0301'; // 'e' + combining acute accent

        const obj1: Canonicalizable = {
            format_version: '1.0',
            circuit_version: '1.0',
            text: strNFC,
        };

        const obj2: Canonicalizable = {
            format_version: '1.0',
            circuit_version: '1.0',
            text: strNFD,
        };

        expect(obj1.text).not.toBe(obj2.text); // JS strings are different
        expect(canonicalHash(obj1)).toBe(canonicalHash(obj2)); // Hashes should be same due to normalization
    });
});
