// ============================================
// LUMI - Streaming Cache Merge Tests
// Phase 03.2-02 — TMDB TR two-layer merge
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TMDBService at the module level
vi.mock('../src/services/api.js', () => ({
    TMDBService: {
        getWatchProviders: vi.fn(),
    },
}));

import { TMDBService } from '../src/services/api.js';

describe('mergeWithTMDB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('appends TMDB providers absent from RapidAPI result', async () => {
        TMDBService.getWatchProviders.mockResolvedValue({
            flatrate: [
                { provider_id: 1968, provider_name: 'Gain', logo_path: '/gain.png' },
                { provider_id: 1888, provider_name: 'Exxen', logo_path: '/exxen.png' },
            ],
            link: 'https://www.themoviedb.org/movie/1/watch?locale=TR',
        });

        const rapidApi = [
            { serviceId: 'blutv', serviceName: 'BluTV', type: 'subscription', group: 'stream', link: 'https://blutv.com/x', logoPath: 'https://cdn/blutv.png', themeColor: null, quality: null },
        ];

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB(rapidApi, 1, 'movie', 'TR');

        const names = merged.map(p => p.serviceName);
        expect(names).toContain('BluTV');
        expect(names).toContain('Gain');
        expect(names).toContain('Exxen');
    });

    it('dedups by serviceId case-insensitively, RapidAPI preferred', async () => {
        TMDBService.getWatchProviders.mockResolvedValue({
            flatrate: [
                { provider_id: 8, provider_name: 'Netflix', logo_path: '/tmdb-netflix.png' },
                { provider_id: 1968, provider_name: 'Gain', logo_path: '/gain.png' },
            ],
        });

        const rapidApi = [
            { serviceId: 'Netflix', serviceName: 'Netflix', type: 'subscription', group: 'stream', link: 'https://netflix.com/x', logoPath: 'https://cdn/netflix.png', themeColor: '#E50914', quality: 'uhd' },
        ];

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB(rapidApi, 1, 'movie', 'TR');

        const netflixEntries = merged.filter(p => p.serviceName.toLowerCase() === 'netflix');
        expect(netflixEntries).toHaveLength(1);
        // RapidAPI version preferred (has themeColor + quality)
        expect(netflixEntries[0].themeColor).toBe('#E50914');
        expect(netflixEntries[0].quality).toBe('uhd');
        // Gain still merged in
        expect(merged.some(p => p.serviceName === 'Gain')).toBe(true);
    });

    it('returns original RapidAPI providers unchanged when TMDB throws', async () => {
        TMDBService.getWatchProviders.mockRejectedValue(new Error('TMDB down'));

        const rapidApi = [
            { serviceId: 'netflix', serviceName: 'Netflix', type: 'subscription', group: 'stream', link: 'x', logoPath: 'y', themeColor: null, quality: null },
        ];

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB(rapidApi, 1, 'movie', 'TR');

        expect(merged).toEqual(rapidApi);
    });

    it('returns original RapidAPI providers unchanged when TMDB returns null', async () => {
        TMDBService.getWatchProviders.mockResolvedValue(null);

        const rapidApi = [
            { serviceId: 'netflix', serviceName: 'Netflix', type: 'subscription', group: 'stream', link: 'x', logoPath: 'y', themeColor: null, quality: null },
        ];

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB(rapidApi, 1, 'movie', 'TR');

        expect(merged).toEqual(rapidApi);
    });

    it('normalizes TMDB-only providers when RapidAPI list empty', async () => {
        TMDBService.getWatchProviders.mockResolvedValue({
            flatrate: [
                { provider_id: 1968, provider_name: 'Gain', logo_path: '/gain.png' },
            ],
            rent: [
                { provider_id: 3, provider_name: 'Google Play Movies', logo_path: '/gp.png' },
            ],
            link: 'https://www.themoviedb.org/movie/1/watch?locale=TR',
        });

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB([], 1, 'movie', 'TR');

        expect(merged).toHaveLength(2);
        const gain = merged.find(p => p.serviceName === 'Gain');
        expect(gain).toBeDefined();
        expect(gain.serviceId).toBe('1968');
        expect(gain.group).toBe('stream');
        expect(gain.type).toBe('subscription');

        const gp = merged.find(p => p.serviceName === 'Google Play Movies');
        expect(gp.group).toBe('rent');
        expect(gp.type).toBe('rent');
    });

    it('rejects non-ISO-2 country codes (security: T-03.2-02-01)', async () => {
        const rapidApi = [
            { serviceId: 'netflix', serviceName: 'Netflix', type: 'subscription', group: 'stream', link: 'x', logoPath: 'y', themeColor: null, quality: null },
        ];

        const { mergeWithTMDB } = await import('../src/services/streaming-cache.js');
        const merged = await mergeWithTMDB(rapidApi, 1, 'movie', 'TR; DROP TABLE');

        // Invalid country → no TMDB call, original list returned
        expect(TMDBService.getWatchProviders).not.toHaveBeenCalled();
        expect(merged).toEqual(rapidApi);
    });
});
