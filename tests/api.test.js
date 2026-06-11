/**
 * LUMI - API Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TMDBService, YouTubeService, RatingsService, API } from '../src/services/api.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;
globalThis.fetch = mockFetch;
if (typeof window !== 'undefined') window.fetch = mockFetch;

describe('API Services', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('TMDBService', () => {
        describe('getDetailsBundle', () => {
            it('collapses details+credits+videos+providers+external_ids into one request', async () => {
                const payload = {
                    id: 27205,
                    title: 'Inception',
                    credits: { cast: Array.from({ length: 14 }, (_, i) => ({ id: i, name: 'A' + i })), crew: [{ id: 99, job: 'Director', name: 'Nolan' }, { id: 99, job: 'Director', name: 'Nolan' }] },
                    videos: { results: [
                        { site: 'YouTube', key: 'k1', type: 'Trailer' },
                        { site: 'YouTube', key: 'k1', type: 'Trailer' },
                        { site: 'Vimeo', key: 'v1', type: 'Trailer' },
                    ] },
                    'watch/providers': { results: { TR: { flatrate: [{ provider_name: 'Netflix' }] }, US: {} } },
                    external_ids: { imdb_id: 'tt1375666' },
                };
                mockFetch.mockResolvedValueOnce({ ok: true, json: async () => payload });

                const bundle = await TMDBService.getDetailsBundle(27205, 'movie', 'tr-TR', 'TR');

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const calledUrl = mockFetch.mock.calls[0][0];
                expect(calledUrl).toContain('append_to_response=');
                expect(decodeURIComponent(calledUrl)).toContain('credits,videos,watch/providers,external_ids');
                expect(bundle.details.id).toBe(27205);
                expect(bundle.credits.cast).toHaveLength(10);      // slice 10
                expect(bundle.credits.crew).toHaveLength(1);        // dedupe
                expect(bundle.videos).toHaveLength(1);              // YouTube + key dedupe
                expect(bundle.providers.flatrate[0].provider_name).toBe('Netflix');
                expect(bundle.imdbId).toBe('tt1375666');
            });

            it('returns null when TMDB yields no id (error body)', async () => {
                mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, status_code: 34 }) });
                const bundle = await TMDBService.getDetailsBundle(1, 'movie');
                expect(bundle).toBeNull();
            });

            it('returns null on fetch failure (proxy 5xx)', async () => {
                mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
                const bundle = await TMDBService.getDetailsBundle(1, 'movie');
                expect(bundle).toBeNull();
            });
        });

        describe('normalizeTitle', () => {
            it('should normalize titles for comparison', () => {
                expect(TMDBService.normalizeTitle('The Matrix')).toBe('the matrix');
                expect(TMDBService.normalizeTitle('Spider-Man: No Way Home')).toBe('spiderman no way home');
                expect(TMDBService.normalizeTitle('Köprü')).toBe('köprü');
            });
        });

        describe('getPosterUrl', () => {
            it('should generate correct poster URL', () => {
                const url = TMDBService.getPosterUrl('/abc123.jpg');
                expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
            });

            it('should support custom sizes', () => {
                const url = TMDBService.getPosterUrl('/abc123.jpg', 'w342');
                expect(url).toBe('https://image.tmdb.org/t/p/w342/abc123.jpg');
            });

            it('should return null for empty path', () => {
                expect(TMDBService.getPosterUrl(null)).toBeNull();
                expect(TMDBService.getPosterUrl('')).toBeNull();
            });
        });

        describe('getBackdropUrl', () => {
            it('should generate correct backdrop URL', () => {
                const url = TMDBService.getBackdropUrl('/backdrop.jpg');
                expect(url).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
            });
        });

        describe('sortByRelevance', () => {
            it('should prioritize exact title matches', () => {
                const results = [
                    { title: 'The Matrix Reloaded', popularity: 100 },
                    { title: 'Matrix', popularity: 50 },
                    { title: 'The Matrix', popularity: 80 },
                ];

                const sorted = TMDBService.sortByRelevance(results, 'The Matrix');
                expect(sorted[0].title).toBe('The Matrix');
            });

            it('should prioritize starts-with matches', () => {
                const results = [
                    { title: 'Something Matrix', popularity: 100 },
                    { title: 'Matrix Revolution', popularity: 50 },
                ];

                const sorted = TMDBService.sortByRelevance(results, 'Matrix');
                expect(sorted[0].title).toBe('Matrix Revolution');
            });
        });

        describe('fetch', () => {
            it('should make API request with correct URL', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ results: [] }),
                });

                await TMDBService.fetch('/movie/popular');

                // NOTE: Phase-3 routes TMDB through /api/tmdb proxy; endpoint is URL-encoded as query param
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringMatching(/\/movie\/popular|%2Fmovie%2Fpopular/),
                    expect.any(Object)
                );
            });

            it('should return empty results on error', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network error'));

                const result = await TMDBService.fetch('/movie/popular');
                expect(result.results).toEqual([]);
            });
        });
    });

    describe('YouTubeService', () => {
        describe('getThumbnailUrl', () => {
            it('should generate correct thumbnail URL', () => {
                const url = YouTubeService.getThumbnailUrl('dQw4w9WgXcQ');
                expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
            });

            it('should support custom quality', () => {
                const url = YouTubeService.getThumbnailUrl('dQw4w9WgXcQ', 'hqdefault');
                expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
            });
        });

        describe('filterVideos', () => {
            it('should filter videos by movie title', () => {
                const videos = [
                    { id: { videoId: '1' }, snippet: { title: 'Inception Trailer', channelTitle: 'Warner Bros' } },
                    { id: { videoId: '2' }, snippet: { title: 'Random Video', channelTitle: 'Random' } },
                ];

                const filtered = YouTubeService.filterVideos(videos, ['trailer'], 'Inception', 'Inception');
                expect(filtered).toHaveLength(1);
                expect(filtered[0].id.videoId).toBe('1');
            });

            it('should exclude fan-made content', () => {
                const videos = [
                    { id: { videoId: '1' }, snippet: { title: 'Inception Fan Made Trailer', channelTitle: 'Fan' } },
                    { id: { videoId: '2' }, snippet: { title: 'Inception Official Trailer', channelTitle: 'Warner Bros' } },
                ];

                const filtered = YouTubeService.filterVideos(videos, ['trailer'], 'Inception', 'Inception');
                expect(filtered).toHaveLength(1);
                expect(filtered[0].snippet.title).toContain('Official');
            });
        });
    });

    describe('RatingsService', () => {
        describe('getAllRatings', () => {
            it('should return null for empty IMDB ID', async () => {
                const result = await RatingsService.getAllRatings(null);
                expect(result).toBeNull();
            });

            it('should parse OMDB response correctly', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        Response: 'True',
                        imdbRating: '8.8',
                        Ratings: [
                            { Source: 'Rotten Tomatoes', Value: '87%' },
                            { Source: 'Metacritic', Value: '74/100' },
                        ],
                    }),
                });

                const result = await RatingsService.getAllRatings('tt1375666');
                expect(result.imdb).toBe(8.8);
                expect(result.rottenTomatoes.tomatometer).toBe(87);
                expect(result.metacritic).toBe(74);
            });
        });
    });

    describe('API (Legacy Compatibility)', () => {
        it('should have all legacy methods', () => {
            expect(API.search).toBeDefined();
            expect(API.getDetails).toBeDefined();
            expect(API.getPopular).toBeDefined();
            expect(API.getPosterUrl).toBeDefined();
            expect(API.searchYouTube).toBeDefined();
            expect(API.getAllRatings).toBeDefined();
        });

        it('should delegate to TMDBService', () => {
            const url = API.getPosterUrl('/test.jpg');
            expect(url).toBe(TMDBService.getPosterUrl('/test.jpg'));
        });
    });
});
