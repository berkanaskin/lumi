/**
 * Phase 04.6-r2 — Real DOM tests for the 3rd-attempt regression fixes.
 *
 *   1. Logo: <img src> points to /img/lumi-logo.png + has srcset, asset
 *      exists on disk and is < 30KB (1x).
 *   2. Banner: tap on the .onb-detection-banner element opens the bottom-
 *      sheet picker (not blocked by swipe handler or trio overlay).
 *   3. Ready CTA: rendered in DOM, sits at the end of the slide (margin-top
 *      auto), tappable.
 */

// 04.6-r2 — Real DOM tests. The global tests/setup.js installs a stub
// document/window mock that does NOT support modern DOM APIs (toggleAttribute,
// dataset, etc.). We override with a fresh JSDOM (matching the r1 pattern) so
// renderWizard can execute against a real DOM and `data-testid` selectors work.
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
    startOnboarding = mod.startOnboarding || mod.default;
    try { localStorage.clear(); } catch { /* jsdom */ }
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.requestAnimationFrame = origRAF;
    global.localStorage = origLocalStorage;
});

describe('04.6-r2 — Fix 1: current Lumi logo (Jan 8 2026 neon spotlight)', () => {
    it('asset file exists at public/img/lumi-logo.png and is < 30KB', () => {
        const p = path.resolve(process.cwd(), 'public/img/lumi-logo.png');
        expect(fs.existsSync(p)).toBe(true);
        const size = fs.statSync(p).size;
        expect(size).toBeGreaterThan(2000);   // not the SVG placeholder
        expect(size).toBeLessThan(30 * 1024); // optimized
    });

    it('retina @2x.png exists alongside', () => {
        const p = path.resolve(process.cwd(), 'public/img/lumi-logo@2x.png');
        expect(fs.existsSync(p)).toBe(true);
        const size = fs.statSync(p).size;
        expect(size).toBeGreaterThan(10 * 1024);
        expect(size).toBeLessThan(80 * 1024);
    });

    it('welcome <img> has srcset pointing to both 1x + 2x', () => {
        startOnboarding();
        const img = document.querySelector('[data-testid="onb-logo-img"]');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toBe('/img/lumi-logo.png');
        const srcset = img.getAttribute('srcset') || '';
        expect(srcset).toContain('/img/lumi-logo.png 1x');
        expect(srcset).toContain('/img/lumi-logo@2x.png 2x');
    });
});

describe('04.6-r2 — Fix 2: banner click chain (deep fix)', () => {
    it('banner exists in the DOM with pointer-events:auto + own row', () => {
        startOnboarding();
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(banner).toBeTruthy();
        expect(banner.tagName.toLowerCase()).toBe('button');
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        // Banner must be a block-level flex now (own row), not inline-flex.
        expect(css).toMatch(/\.onb-detection-banner\s*\{[\s\S]*?display:\s*flex(?!\s*-)/);
        expect(css).toMatch(/\.onb-detection-banner[\s\S]*?pointer-events:\s*auto/);
    });

    it('click on banner opens the bottom-sheet picker', async () => {
        startOnboarding();
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(banner).toBeTruthy();
        // Should not exist before click.
        expect(document.getElementById('onb-locale-picker')).toBeFalsy();
        banner.click();
        await new Promise((r) => setTimeout(r, 30));
        expect(document.getElementById('onb-locale-picker')).toBeTruthy();
    });

    it('swipe handler excludes the banner (no gesture interpretation)', () => {
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/features/onboarding.js'),
            'utf8',
        );
        // isInScrollable must return true for .onb-detection-banner so swipe
        // handler short-circuits and the click can reach the button.
        expect(src).toMatch(/closest\('\.onb-detection-banner'\)/);
    });

    it('parallax wall layers are pointer-events:none (do not block banner)', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        expect(css).toMatch(/\.onb-wall-layer[\s\S]*?pointer-events:\s*none/);
    });
});

describe('04.6-r2 — Fix 4: S4 Ready CTA always visible at slide bottom', () => {
    it('stage is no longer center-justified (root cause of clip)', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        // 04.6-r2 — stage was center-justifying long slides which clipped
        // BOTH the top (banner) and bottom (Ready CTA) in overflow:hidden parent.
        expect(css).toMatch(/\.onb-stage[\s\S]*?justify-content:\s*flex-start/);
        expect(css).toMatch(/\.onb-stage[\s\S]*?overflow-y:\s*auto/);
    });

    it('CTA exists in S4 DOM with text + data-testid', async () => {
        startOnboarding();
        window.__onbGoto?.(3);
        await new Promise((r) => setTimeout(r, 30));
        const cta = document.querySelector('[data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        expect(cta.textContent.trim().length).toBeGreaterThan(0);
        // The CTA must be the LAST tappable child (margin-top:auto pushes to end).
        const slide = document.querySelector('.onb-slide-ready');
        expect(slide).toBeTruthy();
        const tappableChildren = Array.from(slide.children).filter(
            (n) => n.tagName === 'BUTTON' || n.classList?.contains?.('onb-cta'),
        );
        expect(tappableChildren.at(-1)).toBe(cta);
    });

    it('CTA CSS uses margin-top:auto (not sticky)', () => {
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        const ctaBlock = css.match(/\.onb-slide-ready\s+\.onb-cta-ready\s*\{[\s\S]*?\}/);
        expect(ctaBlock).toBeTruthy();
        expect(ctaBlock[0]).toMatch(/margin-top:\s*auto/);
        // Must NOT use sticky anymore.
        expect(ctaBlock[0]).not.toMatch(/position:\s*sticky/);
    });

    it('clicking CTA dispatches close (no error thrown)', async () => {
        startOnboarding();
        window.__onbGoto?.(3);
        await new Promise((r) => setTimeout(r, 30));
        const cta = document.querySelector('[data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        expect(() => cta.click()).not.toThrow();
    });
});

describe('04.6-r2 — Fix 3: real platform logos (TR + global)', () => {
    it('TR niche platforms have real PNG logos', () => {
        const trNiche = ['gain', 'exxen', 'tabii', 'tod', 'puhutv'];
        for (const slug of trNiche) {
            const p = path.resolve(process.cwd(), `public/img/providers/${slug}.png`);
            expect(fs.existsSync(p), `${slug}.png missing`).toBe(true);
            const size = fs.statSync(p).size;
            expect(size, `${slug}.png too small`).toBeGreaterThan(1000);
        }
    });

    it('region-platforms.js references the .png paths (not .svg) for TR niche', () => {
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/data/region-platforms.js'),
            'utf8',
        );
        for (const slug of ['gain', 'exxen', 'tabii', 'tod', 'puhutv']) {
            const re = new RegExp(`slug:\\s*'${slug}'[^}]*logo_path:\\s*'\\/img\\/providers\\/${slug}\\.png'`);
            expect(src, `${slug} not updated to .png`).toMatch(re);
        }
    });

    it('at least 30 global non-TR providers have real PNG logos', () => {
        const dir = path.resolve(process.cwd(), 'public/img/providers');
        const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
        // 10 SVG-only globals were before; now should be 40+
        expect(pngs.length).toBeGreaterThanOrEqual(40);
    });
});
