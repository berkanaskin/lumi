// ============================================
// LUMI - Streaming Availability Tests
// Wave 0 stubs — expanded in subsequent plans
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// StreamingAvailabilityService
// ============================================
describe('StreamingAvailabilityService', () => {
    describe('getProviders', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('calls /api/streaming-availability with correct imdbId and country', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ options: [], fetchedAt: Date.now() }),
            });

            // Dynamic import to avoid module-level side effects
            const { StreamingAvailabilityService } = await import('../src/services/api.js');
            await StreamingAvailabilityService.getProviders('tt0137523', 'tr');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/streaming-availability')
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('imdbId=tt0137523')
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('country=tr')
            );
        });

        it('returns null when response is not ok', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 500 });

            const { StreamingAvailabilityService } = await import('../src/services/api.js');
            const result = await StreamingAvailabilityService.getProviders('tt0137523', 'tr');

            expect(result).toBeNull();
        });

        it('returns null on network error', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const { StreamingAvailabilityService } = await import('../src/services/api.js');
            const result = await StreamingAvailabilityService.getProviders('tt0137523', 'tr');

            expect(result).toBeNull();
        });
    });
});

// ============================================
// getStreamingWithCache
// ============================================
describe('getStreamingWithCache', () => {
    it('returns cached data when cache hit is fresh', async () => {
        const { getStreamingWithCache } = await import('../src/services/streaming-cache.js');
        // Stub test — full test requires mocking Firestore and fetch
        expect(typeof getStreamingWithCache).toBe('function');
    });

    it('calls API on cache miss', async () => {
        const { getStreamingWithCache } = await import('../src/services/streaming-cache.js');
        // Stub test — full test requires mocking Firestore and fetch
        expect(typeof getStreamingWithCache).toBe('function');
    });
});

// ============================================
// GROUP_MAP
// ============================================
describe('GROUP_MAP', () => {
    it('maps subscription to stream', async () => {
        const { GROUP_MAP } = await import('../src/services/streaming-cache.js');
        expect(GROUP_MAP['subscription']).toBe('stream');
    });

    it('maps free to stream', async () => {
        const { GROUP_MAP } = await import('../src/services/streaming-cache.js');
        expect(GROUP_MAP['free']).toBe('stream');
    });

    it('maps addon to stream', async () => {
        const { GROUP_MAP } = await import('../src/services/streaming-cache.js');
        expect(GROUP_MAP['addon']).toBe('stream');
    });

    it('maps rent to rent', async () => {
        const { GROUP_MAP } = await import('../src/services/streaming-cache.js');
        expect(GROUP_MAP['rent']).toBe('rent');
    });

    it('maps buy to buy', async () => {
        const { GROUP_MAP } = await import('../src/services/streaming-cache.js');
        expect(GROUP_MAP['buy']).toBe('buy');
    });
});
