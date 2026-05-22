/**
 * Phase 04.6-01 Task 1.1 — Golden-list region tests.
 *
 * These assertions cannot regress without breaking the user contract locked
 * in .planning/decisions/REGION-PLATFORMS-DRAFT.md.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    REGION_PLATFORMS,
    FALLBACK_PLATFORMS,
    getCuratedForCountry,
    getCuratedOrFallback,
    getAllSlugs,
} from '../src/data/region-platforms.js';

describe('REGION_PLATFORMS shape & coverage', () => {
    it('exports all 13 launch regions', () => {
        const expected = ['TR', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'CA', 'AU', 'BR', 'MX', 'IN'];
        for (const cc of expected) {
            expect(REGION_PLATFORMS[cc], `${cc} should be present`).toBeDefined();
            expect(Array.isArray(REGION_PLATFORMS[cc])).toBe(true);
            expect(REGION_PLATFORMS[cc].length).toBeGreaterThan(0);
        }
    });

    it('every entry has the required shape', () => {
        for (const [cc, list] of Object.entries(REGION_PLATFORMS)) {
            for (const p of list) {
                expect(typeof p.tmdb_id, `${cc} ${p.name} tmdb_id`).toBe('number');
                expect(p.sa_id === null || typeof p.sa_id === 'string', `${cc} ${p.name} sa_id`).toBe(true);
                expect(typeof p.name, `${cc} ${p.name} name`).toBe('string');
                expect(typeof p.slug, `${cc} slug`).toBe('string');
                expect(p.slug).toMatch(/^[a-z0-9-]+$/);
                expect(p.logo_path, `${cc} ${p.name} logo_path prefix`).toMatch(/^\/img\/providers\//);
                expect(typeof p.preSelected, `${cc} ${p.name} preSelected`).toBe('boolean');
            }
        }
    });

    it('preSelected count per region ≤ 4 (UX guard)', () => {
        for (const [cc, list] of Object.entries(REGION_PLATFORMS)) {
            const count = list.filter((p) => p.preSelected).length;
            expect(count, `${cc} preSelected count`).toBeLessThanOrEqual(4);
        }
    });
});

describe('TR golden list (the bug regression)', () => {
    it('TR has exactly 11 platforms (per draft)', () => {
        expect(REGION_PLATFORMS.TR).toHaveLength(11);
    });

    it('TR contains Netflix, Disney+, Amazon Prime, HBO Max, Apple TV+, MUBI, Gain, Exxen, Tabii, TOD, Puhu TV', () => {
        const names = REGION_PLATFORMS.TR.map((p) => p.name);
        expect(names).toContain('Netflix');
        expect(names).toContain('Disney+');
        expect(names).toContain('Amazon Prime Video');
        expect(names).toContain('HBO Max');
        expect(names).toContain('Apple TV+');
        expect(names).toContain('MUBI');
        expect(names).toContain('Gain');
        expect(names).toContain('Exxen');
        expect(names).toContain('Tabii');
        expect(names).toContain('TOD');
        expect(names).toContain('Puhu TV');
    });

    it('TR does NOT contain Epix, Hoichoi, or other niche-bleed entries', () => {
        const names = REGION_PLATFORMS.TR.map((p) => p.name.toLowerCase());
        expect(names).not.toContain('epix');
        expect(names).not.toContain('hoichoi');
        expect(names).not.toContain('dekkoo');
        expect(names).not.toContain('caixaforum+');
    });

    it('TR preSelected = Netflix + Disney+ + Prime (top-3)', () => {
        const preSelected = REGION_PLATFORMS.TR.filter((p) => p.preSelected).map((p) => p.name);
        expect(preSelected).toEqual(['Netflix', 'Disney+', 'Amazon Prime Video']);
    });

    it('TR has BluTV consolidated → HBO Max present, BluTV absent (2024 closure)', () => {
        const names = REGION_PLATFORMS.TR.map((p) => p.name.toLowerCase());
        expect(names).not.toContain('blutv');
        expect(names).toContain('hbo max');
    });
});

describe('DE / FR / JP / KR regional uniqueness', () => {
    it('DE contains RTL+, Joyn, WOW', () => {
        const names = REGION_PLATFORMS.DE.map((p) => p.name);
        expect(names).toContain('RTL+');
        expect(names).toContain('Joyn');
        expect(names).toContain('WOW');
    });

    it('FR contains Canal+, OCS', () => {
        const names = REGION_PLATFORMS.FR.map((p) => p.name);
        expect(names).toContain('Canal+');
        expect(names).toContain('OCS');
    });

    it('JP contains U-NEXT, Hulu Japan, ABEMA', () => {
        const names = REGION_PLATFORMS.JP.map((p) => p.name);
        expect(names).toContain('U-NEXT');
        expect(names).toContain('Hulu Japan');
        expect(names).toContain('ABEMA');
    });

    it('KR contains Wavve, TVING, Coupang Play', () => {
        const names = REGION_PLATFORMS.KR.map((p) => p.name);
        expect(names).toContain('Wavve');
        expect(names).toContain('TVING');
        expect(names).toContain('Coupang Play');
    });
});

describe('getCuratedForCountry helper', () => {
    it('case-insensitive', () => {
        expect(getCuratedForCountry('tr')).toHaveLength(11);
        expect(getCuratedForCountry('TR')).toHaveLength(11);
    });

    it('returns [] for unknown region (no fallback)', () => {
        expect(getCuratedForCountry('XX')).toEqual([]);
        expect(getCuratedForCountry('')).toEqual([]);
        expect(getCuratedForCountry(null)).toEqual([]);
    });

    it('getCuratedOrFallback substitutes FALLBACK_PLATFORMS for unknown', () => {
        expect(getCuratedOrFallback('XX')).toBe(FALLBACK_PLATFORMS);
        expect(getCuratedOrFallback('TR')).toBe(REGION_PLATFORMS.TR);
    });
});

describe('Logo file existence (smoke test)', () => {
    const repoRoot = path.resolve(__dirname, '..');

    it('every region entry logo_path maps to a real file in public/img/providers/', () => {
        const missing = [];
        for (const [cc, list] of Object.entries(REGION_PLATFORMS)) {
            for (const p of list) {
                const fullPath = path.join(repoRoot, 'public', p.logo_path);
                if (!fs.existsSync(fullPath)) {
                    missing.push(`${cc}/${p.name} → ${p.logo_path}`);
                }
            }
        }
        expect(missing, `Missing logos:\n  ${missing.join('\n  ')}`).toHaveLength(0);
    });

    it('FALLBACK_PLATFORMS logos all exist', () => {
        for (const p of FALLBACK_PLATFORMS) {
            const full = path.join(repoRoot, 'public', p.logo_path);
            expect(fs.existsSync(full), `fallback logo missing: ${p.logo_path}`).toBe(true);
        }
    });

    it('getAllSlugs surface matches actual file presence', () => {
        const slugs = getAllSlugs();
        expect(slugs.size).toBeGreaterThan(30);
    });
});
