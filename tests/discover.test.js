/**
 * LUMI - Discover Feature Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import discover module functions
import {
    POETIC_PLACEHOLDERS,
    MOOD_GENRES,
    ERA_RANGES,
    extractMovieKeywords,
} from '../src/features/discover.js';

describe('Discover Feature', () => {
    describe('POETIC_PLACEHOLDERS', () => {
        it('should have at least 5 placeholders', () => {
            expect(POETIC_PLACEHOLDERS.length).toBeGreaterThanOrEqual(5);
        });

        it('should all be non-empty strings', () => {
            POETIC_PLACEHOLDERS.forEach(placeholder => {
                expect(typeof placeholder).toBe('string');
                expect(placeholder.length).toBeGreaterThan(20);
            });
        });

        it('should contain Turkish text', () => {
            const turkishChars = /[üğışçöÜĞİŞÇÖ]/;
            const hasTurkish = POETIC_PLACEHOLDERS.some(p => turkishChars.test(p));
            expect(hasTurkish).toBe(true);
        });
    });

    describe('MOOD_GENRES', () => {
        it('should map mood names to genre IDs', () => {
            expect(MOOD_GENRES).toHaveProperty('chill');
            expect(MOOD_GENRES).toHaveProperty('adrenaline');
            expect(MOOD_GENRES).toHaveProperty('tearjerker');
            expect(MOOD_GENRES).toHaveProperty('mindbending');
            expect(MOOD_GENRES).toHaveProperty('funny');
        });

        it('should have comma-separated genre IDs', () => {
            Object.values(MOOD_GENRES).forEach(genres => {
                expect(genres).toMatch(/^\d+(,\d+)*$/);
            });
        });
    });

    describe('ERA_RANGES', () => {
        it('should have known eras', () => {
            expect(ERA_RANGES).toHaveProperty('classic');
            expect(ERA_RANGES).toHaveProperty('80s');
            expect(ERA_RANGES).toHaveProperty('90s');
            expect(ERA_RANGES).toHaveProperty('2000s');
            expect(ERA_RANGES).toHaveProperty('2010s');
            expect(ERA_RANGES).toHaveProperty('2020s');
        });

        it('should have gte and lte date properties', () => {
            Object.values(ERA_RANGES).forEach(range => {
                expect(range).toHaveProperty('gte');
                expect(range).toHaveProperty('lte');
                expect(range.gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(range.lte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            });
        });

        it('should have chronological order (gte < lte)', () => {
            Object.values(ERA_RANGES).forEach(range => {
                const gte = new Date(range.gte);
                const lte = new Date(range.lte);
                expect(gte.getTime()).toBeLessThan(lte.getTime());
            });
        });
    });

    describe('extractMovieKeywords', () => {
        it('should extract comedy keywords', () => {
            expect(extractMovieKeywords('komik bir film')).toContain('comedy');
            expect(extractMovieKeywords('güleyim biraz')).toContain('comedy');
            expect(extractMovieKeywords('eğlenceli')).toContain('comedy');
        });

        it('should extract horror/thriller keywords', () => {
            const keywords = extractMovieKeywords('korkunç bir film');
            expect(keywords).toContain('horror');
            expect(keywords).toContain('thriller');
        });

        it('should extract action keywords', () => {
            expect(extractMovieKeywords('aksiyon filmi')).toContain('action');
            expect(extractMovieKeywords('heyecanlı')).toContain('action');
        });

        it('should extract romance keywords', () => {
            expect(extractMovieKeywords('romantik bir film')).toContain('romance');
            expect(extractMovieKeywords('aşk hikayesi')).toContain('romance');
        });

        it('should extract drama keywords', () => {
            expect(extractMovieKeywords('drama izliycem')).toContain('drama');
            expect(extractMovieKeywords('ağlatan film')).toContain('drama');
        });

        it('should extract science fiction keywords', () => {
            expect(extractMovieKeywords('bilim kurgu')).toContain('science fiction');
            expect(extractMovieKeywords('uzay filmi')).toContain('science fiction');
        });

        it('should extract animation keywords', () => {
            expect(extractMovieKeywords('animasyon filmi')).toContain('animation');
            expect(extractMovieKeywords('çizgi film')).toContain('animation');
        });

        it('should return empty array for unrecognized queries', () => {
            expect(extractMovieKeywords('xyz123')).toEqual([]);
        });

        it('should extract multiple keywords', () => {
            const keywords = extractMovieKeywords('romantik ve komik bir film');
            expect(keywords).toContain('romance');
            expect(keywords).toContain('comedy');
        });
    });
});
