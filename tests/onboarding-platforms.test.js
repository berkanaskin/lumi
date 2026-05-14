/**
 * Phase 04-04-r3 — Platform catalog tests
 *
 * 1. TR_CURATED logos are all local /img/providers/* paths (no abc.jpg, no TMDB hotlinks)
 * 2. getCuratedProviders('TR') returns 11 entries with local paths
 * 3. getCuratedProviders('US') filters by allowlist AND display_priorities[US]
 * 4. Static fallback kicks in when fetchProviders returns empty
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCuratedProviders } from '../src/features/onboarding.js';

beforeEach(() => {
    if (global.fetch && global.fetch.mockReset) global.fetch.mockReset();
});

describe('TR_CURATED logo paths', () => {
    it('returns 11 entries for TR, all with local /img/providers/* paths', async () => {
        const list = await getCuratedProviders('TR');
        expect(list).toHaveLength(11);
        for (const p of list) {
            expect(p.logoUrl).toMatch(/^\/img\/providers\//);
            expect(p.logoUrl).not.toContain('abc.jpg');
            expect(p.logoUrl).not.toContain('image.tmdb.org');
        }
    });

    it('contains all 11 expected platform IDs', async () => {
        const list = await getCuratedProviders('TR');
        const ids = list.map((p) => p.id).sort((a, b) => a - b);
        expect(ids).toEqual([8, 11, 119, 337, 350, 1855, 1888, 1899, 1968, 2864, 2895]);
    });
});

describe('getCuratedProviders (non-TR) — allowlist filter (r4: trust watch_region)', () => {
    it('filters TMDB results by GLOBAL_POPULAR_PROVIDER_IDS allowlist', async () => {
        // r4: TMDB already region-filters server-side via watch_region. We no
        // longer second-guess that with display_priorities[cc]; we just keep
        // the providers in our curated allowlist.
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { provider_id: 8,   provider_name: 'Netflix',  logo_path: '/n.jpg', display_priorities: { US: 1 } },
                    { provider_id: 337, provider_name: 'Disney+',  logo_path: '/d.jpg', display_priorities: { US: 2 } },
                    // Not in allowlist → drop
                    { provider_id: 9999, provider_name: 'Hoichoi', logo_path: '/h.jpg', display_priorities: { US: 8 } },
                ],
            }),
        });

        const list = await getCuratedProviders('US');
        const ids = list.map((p) => p.id);
        expect(ids).toContain(8);
        expect(ids).toContain(337);
        expect(ids).not.toContain(9999);
    });

    it('returns different lists for different countries (region delta)', async () => {
        // Simulate TMDB's server-side region filter: US returns Netflix+Disney,
        // JP returns Netflix+Crunchyroll. After our allowlist+sort, the two
        // country results MUST differ — that was the bug in r3.
        const byRegion = {
            US: [
                { provider_id: 8,   provider_name: 'Netflix',     logo_path: '/n.jpg', display_priority: 1 },
                { provider_id: 337, provider_name: 'Disney+',     logo_path: '/d.jpg', display_priority: 2 },
            ],
            JP: [
                { provider_id: 8,   provider_name: 'Netflix',     logo_path: '/n.jpg', display_priority: 1 },
                { provider_id: 283, provider_name: 'Crunchyroll', logo_path: '/c.jpg', display_priority: 2 },
            ],
        };
        global.fetch = vi.fn().mockImplementation((url) => {
            const region = String(url).match(/watch_region=([A-Z]{2})/i)?.[1]?.toUpperCase() || 'US';
            return Promise.resolve({
                ok: true,
                json: async () => ({ results: byRegion[region] || [] }),
            });
        });

        const us = (await getCuratedProviders('US')).map((p) => p.id).sort();
        const jp = (await getCuratedProviders('JP')).map((p) => p.id).sort();
        expect(us).not.toEqual(jp);
        expect(us).toContain(337);
        expect(jp).toContain(283);
    });
});

describe('getCuratedProviders static fallback', () => {
    it('returns static global list when fetchProviders yields empty', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        });

        const list = await getCuratedProviders('ZZ');
        expect(list.length).toBeGreaterThan(0);
        for (const p of list) {
            expect(p.logoUrl).toMatch(/^\/img\/providers\//);
            expect(p.logoUrl).not.toContain('image.tmdb.org');
        }
        // Netflix/Disney+/Prime should pre-select
        const netflix = list.find((p) => p.id === 8);
        expect(netflix?.preSelected).toBe(true);
    });

    it('falls back when fetch fails entirely', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false });
        const list = await getCuratedProviders('XX');
        expect(list.length).toBeGreaterThan(0);
    });
});
