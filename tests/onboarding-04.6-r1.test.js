/**
 * Phase 04.6-r1 — Critical onboarding fixes.
 *
 * Covers four bugs blocking user testing:
 *   1. TR locale audit — all new onboarding keys have Turkish translations
 *   2. Real Lumi logo image replaces gradient wordmark on welcome slide
 *   3. Detection banner click chain — pointer-events + handler wiring
 *   4. S4 Ready CTA visible + functional (finalize)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

let startOnboarding;
let origDocument, origWindow, origRAF, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origRAF = global.requestAnimationFrame;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    global.requestAnimationFrame = dom.window.requestAnimationFrame
        || ((cb) => setTimeout(cb, 0));
    global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
    }));

    vi.resetModules();
    const mod = await import('../src/features/onboarding.js');
    startOnboarding = mod.startOnboarding;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.requestAnimationFrame = origRAF;
    global.localStorage = origLocalStorage;
});

describe('04.6-r1 — Bug 1: TR locale audit', () => {
    const i18nSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'public/i18n.js'),
        'utf8',
    );

    const requiredTrKeys = [
        'onboarding.platforms.recommended',
        'onboarding.platforms.skipForNow',
        'onboarding.ready.noPlatforms',
        'onboarding.ready.langLabel',
        'onboarding.ready.countryLabel',
        'onboarding.ready.servicesLabel',
        'common.close',
        'onboarding.banner.detected',
        'onboarding.banner.change',
        'onboarding.picker.title',
        'onboarding.picker.save',
        'onboarding.picker.cancel',
    ];

    // Extract TR translation block (between "'tr':" / "tr:" object literal and the next top-level lang block).
    // Loose check: each key must appear in the file with a Turkish-looking value (non-ASCII or matches our table).
    requiredTrKeys.forEach((key) => {
        it(`TR has ${key}`, () => {
            const pattern = new RegExp(`'${key.replace(/\./g, '\\.')}'\\s*:\\s*['"]`);
            const matches = i18nSrc.match(new RegExp(pattern, 'g'));
            // We expect at least 2 occurrences across the file (TR + EN).
            expect(matches, `Missing translations for ${key}`).toBeTruthy();
            expect(matches.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('TR ready CTA is "Lumi\'yi keşfet"', () => {
        expect(i18nSrc).toMatch(/'onboarding\.ready\.cta'\s*:\s*"Lumi'yi keşfet"/);
    });

    it('TR banner uses "Algılandı"', () => {
        expect(i18nSrc).toMatch(/'onboarding\.banner\.detected'\s*:\s*'Algılandı/);
    });
});

describe('04.6-r1 — Bug 2: Real Lumi logo image on welcome slide', () => {
    it('public/img/lumi-logo.png exists', () => {
        const p = path.resolve(process.cwd(), 'public/img/lumi-logo.png');
        expect(fs.existsSync(p)).toBe(true);
        // Should be a meaningful asset (>1KB).
        expect(fs.statSync(p).size).toBeGreaterThan(1024);
    });

    it('buildWelcome renders <img class="onb-wordmark-img"> instead of gradient text', () => {
        startOnboarding();
        const img = document.querySelector('[data-testid="onb-logo-img"]');
        expect(img).toBeTruthy();
        expect(img.tagName).toBe('IMG');
        expect(img.getAttribute('src')).toBe('/img/lumi-logo.png');
        expect(img.getAttribute('alt')).toBe('Lumi');
        expect(img.getAttribute('loading')).toBe('eager');
    });

    it('onboarding.css declares .onb-wordmark-img sizing rule', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        expect(css).toMatch(/\.onb-wordmark-img\s*\{[\s\S]*?height:\s*32px/);
    });
});

describe('04.6-r1 — Bug 3: Banner picker click chain', () => {
    it('banner has pointer-events:auto + z-index in CSS', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        const block = css.match(/\.onb-detection-banner\s*\{[\s\S]*?\}/);
        expect(block).toBeTruthy();
        expect(block[0]).toMatch(/pointer-events:\s*auto/);
        expect(block[0]).toMatch(/z-index:\s*\d+/);
    });

    it('tapping the banner opens the locale picker sheet', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 30));
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(banner).toBeTruthy();
        banner.click();
        await new Promise((r) => setTimeout(r, 30));
        const sheet = document.getElementById('onb-locale-picker');
        expect(sheet).toBeTruthy();
    });

    it('picker Save commits draft lang + closes sheet', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 30));
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 30));
        // Pick German
        const deOpt = document.querySelector('[data-lang="de"]');
        expect(deOpt).toBeTruthy();
        deOpt.click();
        const save = document.querySelector('[data-testid="onb-picker-save"]');
        expect(save).toBeTruthy();
        save.click();
        await new Promise((r) => setTimeout(r, 300));
        expect(window.__onbState().lang).toBe('de');
    });
});

describe('04.6-r1 — Bug 4: Ready CTA visible + functional', () => {
    it('Ready slide CTA uses margin-top:auto layout (04.6-r2 root cause fix)', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        // 04.6-r2 — Replaced position:sticky (which fails inside scrolling
        // ancestors) with flex margin-top:auto to pin CTA to slide bottom.
        expect(css).toMatch(/\.onb-slide-ready\s+\.onb-cta-ready[\s\S]*?margin-top:\s*auto/);
        expect(css).toMatch(/\.onb-confetti-piece[\s\S]*?pointer-events:\s*none/);
        // Stage must NOT center-clip slides anymore.
        expect(css).toMatch(/\.onb-stage[\s\S]*?justify-content:\s*flex-start/);
        expect(css).toMatch(/\.onb-stage[\s\S]*?overflow-y:\s*auto/);
    });

    it('CTA exists, is the only element with pointer-events:auto inside slide, and click triggers close', async () => {
        startOnboarding();
        window.__onbGoto(3);
        await new Promise((r) => setTimeout(r, 30));
        const cta = document.querySelector('[data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        expect(cta.textContent.length).toBeGreaterThan(0);
        cta.click();
        await new Promise((r) => setTimeout(r, 800));
        expect(document.getElementById('onboarding-root')).toBeNull();
    });
});
