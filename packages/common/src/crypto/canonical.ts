import * as cbor from 'cbor';
import * as crypto from 'crypto';

export interface Canonicalizable {
    format_version: string;
    circuit_version: string;
    [key: string]: any;
}

/**
 * Normalizes a string to UTF-8 NFC.
 */
export function normalizeString(str: string): string {
    return str.normalize('NFC');
}

/**
 * Recursively normalizes all string values in an object to UTF-8 NFC.
 */
export function normalizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return normalizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(normalizeObject);
    }
    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
            newObj[key] = normalizeObject(obj[key]);
        }
        return newObj;
    }
    return obj;
}

/**
 * Computes the canonical hash of an object using CBOR canonical encoding and SHA256.
 * Ensures deterministic byte representation.
 */
export function canonicalHash<T extends Canonicalizable>(obj: T): string {
    // 1. Normalize strings
    const normalized = normalizeObject(obj);

    // 2. Encode with CBOR canonical mode
    const encoded = cbor.encodeCanonical(normalized);

    // 3. Compute SHA256
    const hash = crypto.createHash('sha256');
    hash.update(encoded);

    return hash.digest('hex');
}

/**
 * Serializes an object to canonical CBOR bytes.
 */
export function serializeCanonical<T extends Canonicalizable>(obj: T): Buffer {
    const normalized = normalizeObject(obj);
    return cbor.encodeCanonical(normalized);
}
