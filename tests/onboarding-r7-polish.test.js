// @vitest-environment jsdom
/**
 * Phase 04-04-r7 — Onboarding polish tests.
 *
 *  1. Navigator language auto-detection (DE/FR/ES/IT/JA/KO → matching lang).
 *  2. Corrected TMDB regional provider IDs (DE/FR/UK/JP/KR new IDs).
 *  3. Provider cap raised 12 → 16.
 *  4. Audio toggle removed (no `lumi_onboarding_audio` references in module).
 *  5. Swipe gesture handlers attached and respect blocked targets.
 *  6. Per-slide accent CSS variable applied on data-accent attribute.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveOnboardingLocale, ONBOARDING_LANGS } from '../src/lib/locale.js';
import { _getAllowlistForCountry } from '../src/features/onboarding.js';

function mockStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

describe('04-04-r7 — navigator language auto-detection (onboarding wizard)', () => {
    beforeEach(() => {
        globalThis.localStorage = mockStorage();
        delete globalThis.navigator;
        delete globalThis.window;
    });

    it('de-DE navigator → onboarding renders in German (de)', () => {
        globalThis.navigator = { language: 'de-DE' };
        const r = resolveOnboardingLocale();
        expect(r.lang).toBe('de');
        expect(r.country).toBe('DE');
        expect(r.source).toBe('navigator');
    });

    it('fr-FR navigator → onboarding renders in French (fr)', () => {
        globalThis.navigator = { language: 'fr-FR' };
        expect(resolveOnboardingLocale().lang).toBe('fr');
    });

    it('es-ES, it-IT, ja-JP, ko-KR all map to their own lang', () => {
        for (const [tag, expected] of [['es-ES', 'es'], ['it-IT', 'it'], ['ja-JP', 'ja'], ['ko-KR', 'ko']]) {
            globalThis.navigator = { language: tag };
            expect(resolveOnboardingLocale().lang).toBe(expected);
        }
    });

    it('unsupported language ("xx-YY") falls back to EN', () => {
        globalThis.navigator = { language: 'xx-YY' };
        expect(resolveOnboardingLocale().lang).toBe('en');
    });

    it('stored lumi_locale beats navigator', () => {
        globalThis.navigator = { language: 'de-DE' };
        globalThis.localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'tr', country: 'TR' }));
        expect(resolveOnboardingLocale().lang).toBe('tr');
    });

    it('ONBOARDING_LANGS exposes the full 8-language set', () => {
        expect(ONBOARDING_LANGS).toEqual(expect.arrayContaining(['tr', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko']));
        expect(ONBOARDING_LANGS).toHaveLength(8);
    });
});

describe('04-04-r7 — corrected TMDB provider IDs', () => {
    it('DE allowlist uses RTL+ (298), Joyn (178), WOW (29), Magenta (532)', () => {
        const ids = _getAllowlistForCountry('DE');
        expect(ids).toContain(298); // RTL+ (verified r7)
        expect(ids).toContain(178); // Joyn
        expect(ids).toContain(29);  // WOW
        expect(ids).toContain(532); // Magenta TV
    });

    it('FR allowlist uses Canal+ (381), OCS Go (56), MyCanal (78), France TV (236)', () => {
        const ids = _getAllowlistForCountry('FR');
        expect(ids).toContain(381); // Canal+
        expect(ids).toContain(56);  // OCS Go
        expect(ids).toContain(78);  // MyCanal
        expect(ids).toContain(236); // France TV
    });

    it('UK allowlist includes BBC iPlayer (38), NOW TV (39), BritBox (151), ITVX (1796)', () => {
        const ids = _getAllowlistForCountry('UK');
        expect(ids).toContain(38);
        expect(ids).toContain(39);
        expect(ids).toContain(151);
        expect(ids).toContain(1796);
    });

    it('JP allowlist includes U-NEXT (84), FOD (415), Hulu JP (191), DAZN (1882)', () => {
        const ids = _getAllowlistForCountry('JP');
        expect(ids).toContain(84);
        expect(ids).toContain(415);
        expect(ids).toContain(191);
        expect(ids).toContain(1882);
    });

    it('KR allowlist includes Wavve (356), TVING (1947), Coupang Play (1597), Watcha (97)', () => {
        const ids = _getAllowlistForCountry('KR');
        expect(ids).toContain(356);
        expect(ids).toContain(1947);
        expect(ids).toContain(1597);
        expect(ids).toContain(97);
    });

    it('IN allowlist includes Hotstar (122), Zee5 (232), JioCinema (220)', () => {
        const ids = _getAllowlistForCountry('IN');
        expect(ids).toContain(122);
        expect(ids).toContain(232);
        expect(ids).toContain(220);
    });

    it('AU never promotes 1968 (TR Gain conflict)', () => {
        const ids = _getAllowlistForCountry('AU');
        expect(ids).not.toContain(1968);
    });
});

describe('04-04-r7 — audio toggle removed', () => {
    it('onboarding module source has no AUDIO_PREF_KEY references', async () => {
        // Read the module source directly — fail if any audio identifiers remain.
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/features/onboarding.js'),
            'utf8',
        );
        // playTick() kept as no-op for call-site compat; AUDIO_PREF_KEY + AudioContext gone.
        expect(src).not.toMatch(/AUDIO_PREF_KEY/);
        expect(src).not.toMatch(/lumi_onboarding_audio/);
        expect(src).not.toMatch(/AudioContext/);
        expect(src).not.toMatch(/onb-audio-toggle/);
    });
});

describe('04.6-r7 — swipe handler (source assertions, updated for mockup vocab)', () => {
    let src;
    beforeEach(async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/features/onboarding.js'),
            'utf8',
        );
    });

    it('touchstart/touchend swipe handlers are registered on root', () => {
        expect(src).toMatch(/root\.addEventListener\(['"]touchstart['"]/);
        expect(src).toMatch(/root\.addEventListener\(['"]touchend['"]/);
    });

    it('swipe handler guards against mockup-vocab interactive surfaces', () => {
        // r7 wholesale port: legacy guards (.onb-list/.onb-grid/.onb-search) replaced
        // by mockup vocab. Picker is .loc-card/.loc-list, grids are .plat-grid/.psq-grid.
        expect(src).toMatch(/\.closest\(['"]\.loc-card['"]\)/);
        expect(src).toMatch(/\.closest\(['"]\.loc-list['"]\)/);
        expect(src).toMatch(/\.closest\(['"]\.plat-grid['"]\)/);
        expect(src).toMatch(/\.closest\(['"]\.psq-grid['"]\)/);
    });

    it('per-slide accent uses mockup stage classes (.s0..s3) — CSS variable swap', () => {
        // r7: SLIDE_ACCENTS JS map replaced by stage.classList = "stage s{n}"
        // and CSS rules .stage.s0..s3 set --accent-glow / --ctaA / --orbA tints.
        expect(src).toMatch(/stage\.classList\.add\(['"]s['"]/);
    });

    it('swipe hint key is set in localStorage', () => {
        expect(src).toMatch(/lumi_onboarding_swipe_hint_seen/);
    });
});

describe('04.6-r7 — accent CSS variables defined (mockup per-slide tints)', () => {
    it('onboarding.css defines per-slide stage tints (.stage.s0..s3)', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        // r7 mockup tints — per-stage CSS variable blocks set --accent-glow + --orbA + --ctaA.
        expect(css).toMatch(/\.stage\.s0/);
        expect(css).toMatch(/\.stage\.s1/);
        expect(css).toMatch(/\.stage\.s2/);
        expect(css).toMatch(/\.stage\.s3/);
        expect(css).toMatch(/--accent-glow/);
        expect(css).toMatch(/--ctaA/);
    });

    it('mockup CTA shimmer animation declared', () => {
        const fs = require('node:fs');
        const path = require('node:path');
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        expect(css).toMatch(/@keyframes onb-shimmer/);
    });
});
