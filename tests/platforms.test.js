/**
 * LUMI - Platforms Tests
 */

import { describe, it, expect } from 'vitest';
import {
    PLATFORM_URLS,
    getPlatformUrl,
    isTurkishPlatform,
} from '../src/lib/platforms.js';

describe('platforms', () => {

    describe('PLATFORM_URLS', () => {
        it('should have major global platforms', () => {
            expect(PLATFORM_URLS['Netflix']).toBeDefined();
            expect(PLATFORM_URLS['Disney+']).toBeDefined();
            expect(PLATFORM_URLS['Amazon Prime Video']).toBeDefined();
        });

        it('should have Turkish platforms', () => {
            expect(PLATFORM_URLS['GAIN']).toBeDefined();
            expect(PLATFORM_URLS['Exxen']).toBeDefined();
            // NOTE: BluTV removed in Phase-03.2 (consolidated → HBO Max, 2024 closure)
            expect(PLATFORM_URLS['TOD']).toBeDefined();
        });

        it('should have default fallback', () => {
            expect(PLATFORM_URLS['default']).toBe('https://www.google.com/search?q=');
        });
    });

    describe('getPlatformUrl', () => {
        it('should generate correct Netflix URL', () => {
            const url = getPlatformUrl('Netflix', 'Inception');
            expect(url).toBe('https://www.netflix.com/search?q=Inception');
        });

        it('should encode special characters', () => {
            const url = getPlatformUrl('Netflix', 'The Dark Knight');
            expect(url).toContain('The%20Dark%20Knight');
        });

        it('should fallback to Google for unknown platforms', () => {
            const url = getPlatformUrl('UnknownPlatform', 'Test Movie');
            expect(url).toContain('google.com/search?q=');
        });

        it('should handle Turkish platforms', () => {
            const url = getPlatformUrl('GAIN', 'Test Film');
            expect(url).toContain('gain.tv');
        });
    });

    describe('isTurkishPlatform', () => {
        it('should identify Turkish platforms', () => {
            expect(isTurkishPlatform('GAIN')).toBe(true);
            expect(isTurkishPlatform('Gain')).toBe(true);
            expect(isTurkishPlatform('Exxen')).toBe(true);
            // NOTE: BluTV removed in Phase-03.2 (consolidated → HBO Max, 2024 closure)
            expect(isTurkishPlatform('TOD')).toBe(true);
        });

        it('should return false for global platforms', () => {
            expect(isTurkishPlatform('Netflix')).toBe(false);
            expect(isTurkishPlatform('Disney+')).toBe(false);
            expect(isTurkishPlatform('Amazon Prime Video')).toBe(false);
        });
    });
});
