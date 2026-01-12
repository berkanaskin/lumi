/**
 * LUMI - Helper Functions Tests
 */

import { describe, it, expect } from 'vitest';
import {
    debounce,
    throttle,
    formatDate,
    formatRuntime,
    getYear,
    truncate,
    escapeHtml,
    formatNumber,
    isMobile,
} from '../src/lib/helpers.js';

describe('helpers', () => {

    describe('formatDate', () => {
        it('should format date correctly for TR locale', () => {
            const result = formatDate('2024-05-15', 'tr-TR');
            expect(result).toContain('2024');
        });

        it('should return empty string for null date', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate('')).toBe('');
        });
    });

    describe('formatRuntime', () => {
        it('should format runtime in Turkish', () => {
            expect(formatRuntime(90, 'tr')).toBe('1 sa 30 dk');
            expect(formatRuntime(150, 'tr')).toBe('2 sa 30 dk');
        });

        it('should format runtime in English', () => {
            expect(formatRuntime(90, 'en')).toBe('1h 30m');
            expect(formatRuntime(45, 'en')).toBe('45m');
        });

        it('should handle minutes only', () => {
            expect(formatRuntime(45, 'tr')).toBe('45 dk');
        });

        it('should return empty for null/undefined', () => {
            expect(formatRuntime(null)).toBe('');
            expect(formatRuntime(0)).toBe('');
        });
    });

    describe('getYear', () => {
        it('should extract year from date string', () => {
            expect(getYear('2024-05-15')).toBe('2024');
            expect(getYear('1999-12-31')).toBe('1999');
        });

        it('should return empty for invalid input', () => {
            expect(getYear(null)).toBe('');
            expect(getYear('')).toBe('');
        });
    });

    describe('truncate', () => {
        it('should truncate long text', () => {
            const result = truncate('This is a very long text', 15);
            expect(result).toBe('This is a ve...');
            expect(result.length).toBe(15);
        });

        it('should not truncate short text', () => {
            expect(truncate('Short', 10)).toBe('Short');
        });

        it('should handle null', () => {
            expect(truncate(null, 10)).toBeNull();
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
            expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
            expect(escapeHtml("it's")).toBe("it&#039;s");
            expect(escapeHtml('a & b')).toBe('a &amp; b');
        });

        it('should return empty for null', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('formatNumber', () => {
        it('should format large numbers with K suffix', () => {
            expect(formatNumber(1500)).toBe('1.5K');
            expect(formatNumber(10000)).toBe('10.0K');
        });

        it('should format millions with M suffix', () => {
            expect(formatNumber(1500000)).toBe('1.5M');
        });

        it('should keep small numbers as is', () => {
            expect(formatNumber(500)).toBe('500');
        });

        it('should handle null/undefined', () => {
            expect(formatNumber(null)).toBe('0');
            expect(formatNumber(0)).toBe('0');
        });
    });

    describe('debounce', () => {
        it('should debounce function calls', async () => {
            let counter = 0;
            const fn = debounce(() => counter++, 50);

            fn();
            fn();
            fn();

            expect(counter).toBe(0);

            await new Promise(r => setTimeout(r, 100));
            expect(counter).toBe(1);
        });
    });

    describe('throttle', () => {
        it('should throttle function calls', async () => {
            let counter = 0;
            const fn = throttle(() => counter++, 50);

            fn();
            fn();
            fn();

            expect(counter).toBe(1);

            await new Promise(r => setTimeout(r, 100));
            fn();
            expect(counter).toBe(2);
        });
    });
});
