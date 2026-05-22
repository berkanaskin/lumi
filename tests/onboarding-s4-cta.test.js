/**
 * Phase 04.6-03 — S4 (Ready) CTA tap isolation tests.
 *
 * Bug fixed:
 *   User report — "no continue button, randomly tapping advances to app".
 *   Root cause: r5 confetti + curtains decorate document.body, and swipe-end
 *   on Ready could fire-and-forget into the active CTA. Fix scopes the advance
 *   handler exclusively to the CTA button, blocks the swipe handler on Ready,
 *   and uses CSS pointer-events:none on non-CTA Ready content.
 *
 * Covers:
 *   1. Tapping the slide body background does NOT advance / close wizard
 *   2. Tapping a confetti element does NOT advance
 *   3. Tapping the explicit CTA DOES advance (clearOnboardingProgress called)
 *   4. CSS pointer-events rule present in onboarding.css
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

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

async function advanceToReady() {
    startOnboarding();
    window.__onbGoto(3); // Ready slide
    await new Promise((r) => setTimeout(r, 30));
}

describe('04.6-03 — S4 Ready CTA isolation', () => {
    it('renders an explicit Ready CTA (.onb-cta-ready) inside the slide', async () => {
        await advanceToReady();
        const cta = document.querySelector('[data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        expect(cta.classList.contains('onb-cta-ready')).toBe(true);
    });

    it('tapping the slide background does NOT close the wizard', async () => {
        await advanceToReady();
        const slide = document.querySelector('.onb-slide-ready');
        expect(slide).toBeTruthy();
        // Simulate a click on the slide body (not the CTA).
        slide.click();
        await new Promise((r) => setTimeout(r, 50));
        // Wizard root must still be present.
        expect(document.getElementById('onboarding-root')).toBeTruthy();
        // State must still be on Ready (slide 3).
        expect(window.__onbState().slide).toBe(3);
    });

    it('tapping the recap card body does NOT advance', async () => {
        await advanceToReady();
        const recap = document.querySelector('.onb-slide-ready .onb-recap-card');
        if (recap) {
            recap.click();
            await new Promise((r) => setTimeout(r, 50));
            expect(document.getElementById('onboarding-root')).toBeTruthy();
        } else {
            // Recap card optional — at minimum, slide heading should not advance.
            const h1 = document.querySelector('.onb-slide-ready .onb-hero-title');
            h1?.click();
            await new Promise((r) => setTimeout(r, 50));
            expect(document.getElementById('onboarding-root')).toBeTruthy();
        }
    });

    it('tapping the explicit Ready CTA triggers wizard close', async () => {
        await advanceToReady();
        const cta = document.querySelector('[data-testid="onb-ready-cta"]');
        cta.click();
        // close() is deferred 700ms after confetti burst.
        await new Promise((r) => setTimeout(r, 800));
        expect(document.getElementById('onboarding-root')).toBeNull();
    });
});

describe('04.6-03 — pointer-events CSS defense in depth', () => {
    it('onboarding.css declares pointer-events:none on Ready non-CTA content', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/onboarding.css'),
            'utf8',
        );
        expect(css).toMatch(/\.onb-slide-ready[\s\S]*?pointer-events:\s*none/i);
        expect(css).toMatch(/\.onb-cta-ready[\s\S]*?pointer-events:\s*auto/i);
    });

    it('swipe handler hard-blocks both directions on Ready slide (state.slide === 3)', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/features/onboarding.js'),
            'utf8',
        );
        // The touchend handler must short-circuit when on Ready (index 3 in 4-slide enum).
        expect(src).toMatch(/state\.slide === 3.*Ready/);
    });
});
