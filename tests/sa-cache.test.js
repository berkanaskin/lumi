/**
 * Phase 04.6-01 Task 1.2 — Streaming-Availability cache tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getCachedSAProviders,
    extractSAServiceIds,
    clearSACache,
    setCacheTTL,
    resetCacheTTL,
} from '../src/lib/sa-cache.js';

function okJson(body) {
    return {
        ok: true,
        status: 200,
        json: async () => body,
    };
}

function errResp(status) {
    return {
        ok: false,
        status,
        json: async () => ({ error: 'x' }),
    };
}

beforeEach(() => {
    clearSACache();
    resetCacheTTL();
});

describe('getCachedSAProviders — cache hit/miss', () => {
    it('cache miss → fetches, caches, returns _cache:miss', async () => {
        const fetchFn = vi.fn().mockResolvedValue(okJson({
            options: [{ service: { id: 'netflix', name: 'Netflix' } }],
            fetchedAt: 123,
        }));

        const r1 = await getCachedSAProviders('TR', 'movie', { fetchFn });
        expect(r1._cache).toBe('miss');
        expect(r1.options).toHaveLength(1);
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('cache hit → returns cached without re-fetching, _cache:hit', async () => {
        const fetchFn = vi.fn().mockResolvedValue(okJson({
            options: [{ service: { id: 'netflix', name: 'Netflix' } }],
            fetchedAt: 123,
        }));

        await getCachedSAProviders('TR', 'movie', { fetchFn });
        const r2 = await getCachedSAProviders('TR', 'movie', { fetchFn });
        expect(r2._cache).toBe('hit');
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('different country/type → independent cache slots', async () => {
        const fetchFn = vi.fn().mockResolvedValue(okJson({ options: [], fetchedAt: 1 }));
        await getCachedSAProviders('TR', 'movie', { fetchFn });
        await getCachedSAProviders('TR', 'series', { fetchFn });
        await getCachedSAProviders('DE', 'movie', { fetchFn });
        expect(fetchFn).toHaveBeenCalledTimes(3);
    });
});

describe('getCachedSAProviders — failure modes degrade silently', () => {
    it('upstream 429 → returns null, does NOT cache', async () => {
        const fetchFn = vi.fn().mockResolvedValue(errResp(429));
        const r1 = await getCachedSAProviders('TR', 'movie', { fetchFn });
        expect(r1).toBeNull();

        // Next call must still re-fetch (no negative caching)
        const fetchFn2 = vi.fn().mockResolvedValue(okJson({ options: [], fetchedAt: 1 }));
        const r2 = await getCachedSAProviders('TR', 'movie', { fetchFn: fetchFn2 });
        expect(r2).not.toBeNull();
        expect(fetchFn2).toHaveBeenCalledTimes(1);
    });

    it('upstream 502/503 → returns null', async () => {
        const fetchFn = vi.fn().mockResolvedValue(errResp(502));
        expect(await getCachedSAProviders('TR', 'movie', { fetchFn })).toBeNull();
    });

    it('network error/timeout → returns null', async () => {
        const fetchFn = vi.fn().mockRejectedValue(new Error('Network down'));
        expect(await getCachedSAProviders('TR', 'movie', { fetchFn })).toBeNull();
    });

    it('malformed JSON (no options array) → returns null', async () => {
        const fetchFn = vi.fn().mockResolvedValue(okJson({ wrong: 'shape' }));
        expect(await getCachedSAProviders('TR', 'movie', { fetchFn })).toBeNull();
    });
});

describe('TTL expiry', () => {
    it('after TTL elapses, next call re-fetches', async () => {
        setCacheTTL(10); // 10ms

        const fetchFn = vi.fn().mockResolvedValue(okJson({
            options: [{ service: { id: 'netflix', name: 'Netflix' } }],
            fetchedAt: 1,
        }));

        await getCachedSAProviders('TR', 'movie', { fetchFn });
        expect(fetchFn).toHaveBeenCalledTimes(1);

        // Wait past TTL
        await new Promise((r) => setTimeout(r, 25));

        await getCachedSAProviders('TR', 'movie', { fetchFn });
        expect(fetchFn).toHaveBeenCalledTimes(2);
    });
});

describe('extractSAServiceIds', () => {
    it('returns set of lowercased service ids', () => {
        const ids = extractSAServiceIds({
            options: [
                { service: { id: 'Netflix' } },
                { service: { id: 'Prime' } },
                { service: { id: 'netflix' } }, // dupe
            ],
        });
        expect(ids).toEqual(new Set(['netflix', 'prime']));
    });

    it('returns empty Set on null / malformed input', () => {
        expect(extractSAServiceIds(null).size).toBe(0);
        expect(extractSAServiceIds({}).size).toBe(0);
        expect(extractSAServiceIds({ options: 'not-array' }).size).toBe(0);
    });
});
