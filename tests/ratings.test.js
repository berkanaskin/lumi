// ============================================
// LUMI - Ratings Service Tests
// Wave 0 stubs — expanded in subsequent plans
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// RatingsService
// ============================================
describe('RatingsService', () => {
    describe('getAllRatings', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('calls /api/omdb proxy (not direct omdbapi.com)', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    Response: 'True',
                    imdbRating: '8.8',
                    Ratings: [
                        { Source: 'Internet Movie Database', Value: '8.8/10' },
                        { Source: 'Rotten Tomatoes', Value: '89%' },
                        { Source: 'Metacritic', Value: '74/100' },
                    ],
                    Awards: 'Won 1 Oscar.',
                }),
            });

            const { RatingsService } = await import('../src/services/api.js');
            await RatingsService.getAllRatings('tt0137523');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/omdb')
            );
            // Must NOT call direct OMDb endpoint
            expect(global.fetch).not.toHaveBeenCalledWith(
                expect.stringContaining('omdbapi.com')
            );
        });

        it('returns correct shape with imdb, rottenTomatoes, metacritic, awards', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    Response: 'True',
                    imdbRating: '8.8',
                    Ratings: [
                        { Source: 'Rotten Tomatoes', Value: '89%' },
                        { Source: 'Metacritic', Value: '74/100' },
                    ],
                    Awards: 'Won 1 Oscar.',
                }),
            });

            const { RatingsService } = await import('../src/services/api.js');
            const result = await RatingsService.getAllRatings('tt0137523');

            expect(result).not.toBeNull();
            expect(result).toHaveProperty('imdb');
            expect(result).toHaveProperty('rottenTomatoes');
            expect(result).toHaveProperty('metacritic');
            expect(result).toHaveProperty('awards');
        });

        it('includes awards field in response', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    Response: 'True',
                    imdbRating: '8.8',
                    Ratings: [],
                    Awards: 'Won 2 Oscars. 56 wins & 129 nominations total',
                }),
            });

            const { RatingsService } = await import('../src/services/api.js');
            const result = await RatingsService.getAllRatings('tt0468569');

            expect(result.awards).toBe('Won 2 Oscars. 56 wins & 129 nominations total');
        });

        it('returns null when imdbId is not provided', async () => {
            const { RatingsService } = await import('../src/services/api.js');
            const result = await RatingsService.getAllRatings(null);

            expect(result).toBeNull();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('returns null when OMDb response is False', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ Response: 'False', Error: 'Movie not found!' }),
            });

            const { RatingsService } = await import('../src/services/api.js');
            const result = await RatingsService.getAllRatings('tt9999999');

            expect(result).toBeNull();
        });

        it('awards is null when Awards field is missing from response', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    Response: 'True',
                    imdbRating: '7.0',
                    Ratings: [],
                }),
            });

            const { RatingsService } = await import('../src/services/api.js');
            const result = await RatingsService.getAllRatings('tt1234567');

            expect(result.awards).toBeNull();
        });
    });
});
