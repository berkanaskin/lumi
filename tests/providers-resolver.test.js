/**
 * Phase 04.6-01 Task 1.3 — providers-resolver tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getResolvedProviders, filterProvidersToCurated } from '../src/lib/providers-resolver.js';
import { clearSACache } from '../src/lib/sa-cache.js';

beforeEach(() => clearSACache());

const SA_TR = {
    options: [
        { service: { id: 'netflix' } },
        { service: { id: 'prime' } },
        { service: { id: 'disney' } },
        { service: { id: 'exxen' } },
        { service: { id: 'gain' } },
    ],
};

describe('getResolvedProviders — TR (curated wins)', () => {
    it('TR + SA-live → returns 11 curated entries in curated order with live annotations', async () => {
        const saFetcher = vi.fn().mockResolvedValue(SA_TR);
        const list = await getResolvedProviders('TR', 'movie', { saFetcher });

        expect(list).toHaveLength(11);
        expect(list[0].name).toBe('Netflix');
        expect(list[1].name).toBe('Disney+');
        expect(list[2].name).toBe('Amazon Prime Video');
        // SA annotated
        expect(list.find((p) => p.name === 'Netflix').live).toBe(true);
        expect(list.find((p) => p.name === 'Gain').live).toBe(true);
        // SA said nothing about HBO Max → live:false (since SA was queried)
        expect(list.find((p) => p.name === 'HBO Max').live).toBe(false);
        // every entry source='curated'
        for (const p of list) expect(p.source).toBe('curated');
    });

    it('TR + SA-rate-limited (null) → returns curated 11, live=null everywhere, no crash', async () => {
        const saFetcher = vi.fn().mockResolvedValue(null);
        const list = await getResolvedProviders('TR', 'movie', { saFetcher });

        expect(list).toHaveLength(11);
        for (const p of list) expect(p.live).toBeNull();
    });

    it('TR + SA throws → still returns curated (silent degrade)', async () => {
        const saFetcher = vi.fn().mockRejectedValue(new Error('boom'));
        const list = await getResolvedProviders('TR', 'movie', { saFetcher });
        expect(list).toHaveLength(11);
    });

    it('TR list does NOT contain Epix or Hoichoi regardless of SA payload', async () => {
        // Even if SA somehow returned weird ids, they cannot inject niche bleed.
        const saFetcher = vi.fn().mockResolvedValue({
            options: [{ service: { id: 'epix' } }, { service: { id: 'hoichoi' } }],
        });
        const list = await getResolvedProviders('TR', 'movie', { saFetcher });
        const names = list.map((p) => p.name.toLowerCase());
        expect(names).not.toContain('epix');
        expect(names).not.toContain('hoichoi');
    });
});

describe('getResolvedProviders — regional uniqueness', () => {
    it('DE returns curated with RTL+, Joyn, WOW present in curated order', async () => {
        const saFetcher = vi.fn().mockResolvedValue(null);
        const list = await getResolvedProviders('DE', 'movie', { saFetcher });
        const names = list.map((p) => p.name);
        expect(names).toContain('RTL+');
        expect(names).toContain('Joyn');
        expect(names).toContain('WOW');
        // WOW comes before RTL+ per draft order
        expect(names.indexOf('WOW')).toBeLessThan(names.indexOf('RTL+'));
        expect(names.indexOf('RTL+')).toBeLessThan(names.indexOf('Joyn'));
    });

    it('FR returns Canal+, OCS', async () => {
        const saFetcher = vi.fn().mockResolvedValue(null);
        const list = await getResolvedProviders('FR', 'movie', { saFetcher });
        const names = list.map((p) => p.name);
        expect(names).toContain('Canal+');
        expect(names).toContain('OCS');
    });

    it('JP returns U-NEXT, Hulu Japan, ABEMA', async () => {
        const saFetcher = vi.fn().mockResolvedValue(null);
        const list = await getResolvedProviders('JP', 'movie', { saFetcher });
        const names = list.map((p) => p.name);
        expect(names).toContain('U-NEXT');
        expect(names).toContain('Hulu Japan');
        expect(names).toContain('ABEMA');
    });
});

describe('getResolvedProviders — TMDB fallback (uncurated region)', () => {
    it('XX (unknown) + TMDB success → returns TMDB results mapped', async () => {
        const tmdbFetcher = vi.fn().mockResolvedValue([
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
            { provider_id: 337, provider_name: 'Disney+', logo_path: '/d.jpg' },
        ]);
        const list = await getResolvedProviders('XX', 'movie', {
            saFetcher: () => null,
            tmdbFetcher,
        });
        expect(list).toHaveLength(2);
        expect(list[0].id).toBe(8);
        expect(list[0].source).toBe('tmdb-fallback');
        expect(list[0].logoUrl).toContain('image.tmdb.org');
    });

    it('XX + TMDB fail → returns FALLBACK_PLATFORMS (Netflix/Disney+/Prime/Apple TV+/MUBI/Crunchyroll)', async () => {
        const list = await getResolvedProviders('XX', 'movie', {
            saFetcher: () => null,
            tmdbFetcher: () => [],
        });
        // Must NOT be empty — universal fallback kicks in.
        expect(list.length).toBeGreaterThanOrEqual(5);
        const names = list.map((p) => p.name);
        expect(names).toContain('Netflix');
        expect(names).toContain('Disney+');
        expect(names).toContain('Amazon Prime Video');
    });
});

describe('filterProvidersToCurated — detail overlay helper', () => {
    it('returns curated-ordered subset matching SA-shaped raw providers', () => {
        const raw = [
            { serviceId: 'exxen', serviceName: 'Exxen', logoPath: '/x.png', group: 'stream' },
            { serviceId: 'netflix', serviceName: 'Netflix', logoPath: '/n.png', group: 'stream' },
            { serviceId: 'hoichoi', serviceName: 'Hoichoi', logoPath: '/h.png', group: 'stream' },
        ];
        const out = filterProvidersToCurated(raw, 'TR');
        // Netflix comes first in TR curated order, Exxen is at index 7
        const names = out.map((p) => p.serviceName);
        expect(names[0]).toBe('Netflix');
        expect(names).toContain('Exxen');
        expect(names).not.toContain('Hoichoi'); // dropped — not curated
    });

    it('falls back to raw list if nothing matches curated (defensive)', () => {
        const raw = [{ serviceId: 'random', serviceName: 'Random' }];
        const out = filterProvidersToCurated(raw, 'TR');
        expect(out).toEqual(raw);
    });

    it('unknown country → returns raw unchanged', () => {
        const raw = [{ serviceId: 'netflix', serviceName: 'Netflix' }];
        expect(filterProvidersToCurated(raw, 'XX')).toBe(raw);
    });

    it('matches by serviceName when serviceId missing', () => {
        const raw = [{ serviceName: 'Netflix', logoPath: '/n.png' }];
        const out = filterProvidersToCurated(raw, 'TR');
        expect(out).toHaveLength(1);
        expect(out[0].serviceName).toBe('Netflix');
    });
});
