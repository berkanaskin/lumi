/**
 * Phase 05-03 — Agent hub. Real JSDOM (see paywall-sheet.test.js note).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let openAgentHub, PREMIUM_KEY;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;

    vi.resetModules();
    const ent = await import('../src/lib/entitlements.js');
    PREMIUM_KEY = ent.PREMIUM_KEY;
    const hub = await import('../src/features/agent-hub.js');
    openAgentHub = hub.openAgentHub;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('agent-hub — Movie Night Agent center (Phase 05-03)', () => {
    it('injects the launcher FAB on import', () => {
        expect(document.getElementById('agent-fab')).toBeTruthy();
    });

    it('opens a hub with the three feature cards', () => {
        openAgentHub();
        expect(document.querySelector('[data-testid="agent-hub"]')).toBeTruthy();
        expect(document.querySelectorAll('[data-testid="agent-card"]').length).toBe(3);
    });

    it('free user tapping a feature opens the paywall (not the feature)', () => {
        openAgentHub();
        document.querySelector('[data-testid="agent-card"]').click();
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeTruthy();
    });

    it('premium user lands on the Decide-for-Me panel by default', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openAgentHub();
        expect(document.querySelector('[data-testid="decide-go"]')).toBeTruthy();
    });

    it('is idempotent — does not stack overlays', () => {
        openAgentHub();
        openAgentHub();
        expect(document.querySelectorAll('[data-testid="agent-hub"]').length).toBe(1);
    });

    it('FAB carries a visible text label, not a bare icon (05-A3)', () => {
        const fab = document.getElementById('agent-fab');
        expect(fab.querySelector('.agent-fab-label')?.textContent).toMatch(/Agent/i);
    });

    it('free user sees the explicit locked banner in the hub (05-A3)', () => {
        openAgentHub();
        expect(document.querySelector('.agent-locked-banner')).toBeTruthy();
        expect(document.querySelectorAll('.agent-card.locked').length).toBe(3);
    });

    it('premium user sees no locked banner (05-A3)', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openAgentHub();
        expect(document.querySelector('.agent-locked-banner')).toBeFalsy();
        expect(document.querySelectorAll('.agent-card.locked').length).toBe(0);
    });
});
