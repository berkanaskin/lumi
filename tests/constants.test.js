/**
 * LUMI - Constants Tests
 */

import { describe, it, expect } from 'vitest';
import {
    GENRES,
    GENRES_EN,
    getGenreName,
    getGenreId,
    getImageUrl,
    getRandomPlaceholder,
    AI_PLACEHOLDERS,
    DAILY_REC_KEY,
    DAILY_REC_CATEGORIES,
    IMAGE_SIZES,
    TMDB_IMAGE_BASE,
} from '../src/lib/constants.js';

describe('constants', () => {

    describe('GENRES', () => {
        it('should have all major genres', () => {
            expect(GENRES[28]).toBe('Aksiyon');
            expect(GENRES[35]).toBe('Komedi');
            expect(GENRES[18]).toBe('Drama');
            expect(GENRES[27]).toBe('Korku');
        });

        it('should have English equivalents', () => {
            expect(GENRES_EN[28]).toBe('Action');
            expect(GENRES_EN[35]).toBe('Comedy');
        });
    });

    describe('getGenreName', () => {
        it('should return Turkish genre name by default', () => {
            expect(getGenreName(28)).toBe('Aksiyon');
            expect(getGenreName(35)).toBe('Komedi');
        });

        it('should return English genre name when specified', () => {
            expect(getGenreName(28, 'en')).toBe('Action');
            expect(getGenreName(35, 'en')).toBe('Comedy');
        });

        it('should return empty string for unknown genre', () => {
            expect(getGenreName(99999)).toBe('');
        });
    });

    describe('getGenreId', () => {
        it('should return genre ID from Turkish name', () => {
            expect(getGenreId('Aksiyon')).toBe(28);
            expect(getGenreId('Komedi')).toBe(35);
        });

        it('should return genre ID from English name', () => {
            expect(getGenreId('Action')).toBe(28);
            expect(getGenreId('Comedy')).toBe(35);
        });

        it('should be case insensitive', () => {
            expect(getGenreId('aksiyon')).toBe(28);
            expect(getGenreId('ACTION')).toBe(28);
        });

        it('should return null for unknown genre', () => {
            expect(getGenreId('Unknown Genre')).toBeNull();
        });
    });

    describe('getImageUrl', () => {
        it('should generate correct poster URL', () => {
            const url = getImageUrl('/abc123.jpg', 'poster', 'medium');
            expect(url).toBe(`${TMDB_IMAGE_BASE}/w342/abc123.jpg`);
        });

        it('should generate correct backdrop URL', () => {
            const url = getImageUrl('/abc123.jpg', 'backdrop', 'large');
            expect(url).toBe(`${TMDB_IMAGE_BASE}/w1280/abc123.jpg`);
        });

        it('should return empty for null path', () => {
            expect(getImageUrl(null)).toBe('');
            expect(getImageUrl('')).toBe('');
        });
    });

    describe('getRandomPlaceholder', () => {
        it('should return a string from AI_PLACEHOLDERS', () => {
            const placeholder = getRandomPlaceholder();
            expect(AI_PLACEHOLDERS).toContain(placeholder);
        });
    });

    describe('DAILY_REC constants', () => {
        it('should have correct key', () => {
            expect(DAILY_REC_KEY).toBe('lumi_daily_recommendation');
        });

        it('should have categories with lists or genres', () => {
            expect(DAILY_REC_CATEGORIES.length).toBeGreaterThan(0);
            DAILY_REC_CATEGORIES.forEach(cat => {
                expect(cat.label).toBeDefined();
                expect(cat.list || cat.genres).toBeDefined();
            });
        });
    });

    describe('IMAGE_SIZES', () => {
        it('should have poster sizes', () => {
            expect(IMAGE_SIZES.poster.small).toBe('w185');
            expect(IMAGE_SIZES.poster.medium).toBe('w342');
            expect(IMAGE_SIZES.poster.large).toBe('w500');
        });

        it('should have backdrop sizes', () => {
            expect(IMAGE_SIZES.backdrop.medium).toBe('w780');
            expect(IMAGE_SIZES.backdrop.large).toBe('w1280');
        });
    });
});
