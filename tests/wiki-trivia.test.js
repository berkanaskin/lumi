/**
 * Phase 05.5-12 — Wikipedia kaynaklı trivia ham maddesi.
 */
import { describe, it, expect, vi } from 'vitest';
import { wikiTitleCandidates, pickWikiSections, fetchWikiNotes } from '../src/lib/wiki-trivia.js';
import { buildGroundedPrompt } from '../src/lib/trivia-grounding.js';

const INCEPTION = {
    title: 'Başlangıç',
    original_title: 'Inception',
    release_date: '2010-07-15',
};

describe('wikiTitleCandidates', () => {
    it('orijinal ad + yıl/film varyantlarını üretir', () => {
        const c = wikiTitleCandidates(INCEPTION, 'movie');
        expect(c).toContain('Inception (2010 film)');
        expect(c).toContain('Inception (film)');
        expect(c).toContain('Inception');
        expect(c).toContain('Başlangıç');
    });

    it('dizide TV series eki kullanır', () => {
        const c = wikiTitleCandidates({ name: 'From', original_name: 'From', first_air_date: '2022-02-20' }, 'tv');
        expect(c[0]).toBe('From (2022 TV series)');
    });
});

describe('pickWikiSections', () => {
    const EXTRACT = [
        'Inception is a 2010 science fiction film...',
        '== Plot ==',
        'Dom Cobb is a thief...'.padEnd(120, 'x'),
        '== Production ==',
        'Nolan first pitched the film to Warner Bros in 2001, but felt he needed more experience...'.padEnd(200, 'y'),
        '== Filming ==',
        'Filming took place in six countries, beginning in Tokyo...'.padEnd(200, 'z'),
        '== See also ==',
        'List of films',
    ].join('\n');

    it('yalnız trivia değeri taşıyan bölümleri seçer (Plot/See also dışarıda)', () => {
        const out = pickWikiSections(EXTRACT);
        expect(out).toContain('== Production ==');
        expect(out).toContain('== Filming ==');
        expect(out).not.toContain('Dom Cobb');
        expect(out).not.toContain('List of films');
    });

    it('hiç bölüm yoksa giriş paragrafına düşer', () => {
        const out = pickWikiSections('Just an intro paragraph about the film.\n== See also ==\nstuff');
        expect(out).toContain('intro paragraph');
    });

    it('4000 karakterde keser', () => {
        const big = '== Production ==\n' + 'a'.repeat(10000);
        expect(pickWikiSections(big).length).toBeLessThanOrEqual(4000);
    });
});

describe('fetchWikiNotes', () => {
    it('en uzun extract\'lı sayfayı seçer ve bölümleri ayıklar', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                query: { pages: {
                    '1': { title: 'Inception', extract: 'short' },
                    '2': { title: 'Inception (2010 film)', extract: 'Inception is a 2010 science fiction film directed by Christopher Nolan.\n== Production ==\n' + 'Nolan worked on the script for ten years...'.padEnd(1600, '.') },
                } },
            }),
        }));
        const out = await fetchWikiNotes(INCEPTION, 'movie', fetchImpl);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(out.source).toBe('en.wikipedia');
        expect(out.text).toContain('== Production ==');
    });

    it('sayfa yoksa/kısaysa null döner (sessiz düşüş)', async () => {
        const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ query: { pages: { '-1': { missing: '' } } } }) }));
        expect(await fetchWikiNotes(INCEPTION, 'movie', fetchImpl)).toBeNull();
        const fetch500 = vi.fn(async () => ({ ok: false }));
        expect(await fetchWikiNotes(INCEPTION, 'movie', fetch500)).toBeNull();
    });
});

describe('buildGroundedPrompt + wikiNotes', () => {
    it('wiki varken SOURCE_MATERIAL bloğu ve seçim talimatı eklenir; literaller korunur', () => {
        const p = buildGroundedPrompt({ source: 'omdb+tmdb', facts: { title: 'Inception' } }, 'movie', '== Production ==\nNolan...');
        expect(p).toContain('Use ONLY these facts');
        expect(p).toContain('≤3 short bullets');
        expect(p).toContain('GROUND_TRUTH:');
        expect(p).toContain('SOURCE_MATERIAL (Wikipedia):');
        expect(p).toContain('conversation-worthy');
        expect(p).toContain('omdb+tmdb+wikipedia');
    });

    it('wiki yokken prompt birebir eski davranış', () => {
        const p = buildGroundedPrompt({ source: 'tmdb-only', facts: { title: 'X' } }, 'movie');
        expect(p).not.toContain('SOURCE_MATERIAL');
        expect(p).toContain('GROUND_TRUTH_SOURCE: tmdb-only');
    });
});
