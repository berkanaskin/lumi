/**
 * Phase 05-05 — Notification Center UI. Real JSDOM (the repo mocks `document` in
 * tests/setup.js; DOM-render tests need a real tree + dynamic import).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createMockDb } from './fixtures/firebase-mock.js';

let renderInbox, addEvent;
let origDocument, origWindow, origLocalStorage;

const BELL_HTML = `
  <button class="header-btn has-badge" id="notifications-btn"><span>bell</span></button>
  <div class="header-dropdown" id="notifications-dropdown">
    <button id="mark-all-read">mark</button>
    <div class="dropdown-list" id="notifications-list"><div class="dropdown-empty">empty</div></div>
  </div>`;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM(`<!doctype html><html><head></head><body>${BELL_HTML}</body></html>`, {
        url: 'http://localhost/', pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;

    // premium + a uid so the inbox wires.
    const ent = await import('../src/lib/entitlements.js');
    ent.applyEntitlement(true);
    dom.window.AuthService = { currentUser: { uid: 'u1' } };

    vi.resetModules();
    const ns = await import('../src/lib/notif-store.js');
    addEvent = (uid, ev, db) => ns.addEvent(uid, ev, db);
    const mod = await import('../src/features/notifications.js');
    renderInbox = mod.renderInbox;
    // re-apply premium after resetModules re-imported entitlements
    (await import('../src/lib/entitlements.js')).applyEntitlement(true);
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('notifications UI (Phase 05-05)', () => {
    it('renders events into the existing #notifications-list', () => {
        renderInbox([
            { id: 'n1', type: 'new_episode', title: 'Yeni bölüm', body: 'Severance S2B4', read: false, createdAt: Date.now() },
            { id: 'n2', type: 'platform_change', title: 'Yeni platform', body: 'Dune Netflix', read: true, createdAt: Date.now() },
        ]);
        expect(document.querySelectorAll('[data-testid="notif-item"]').length).toBe(2);
    });

    it('shows an unread badge with the unread count', () => {
        renderInbox([
            { id: 'n1', type: 'new_episode', title: 'a', body: 'b', read: false, createdAt: Date.now() },
            { id: 'n2', type: 'new_episode', title: 'c', body: 'd', read: false, createdAt: Date.now() },
            { id: 'n3', type: 'new_episode', title: 'e', body: 'f', read: true, createdAt: Date.now() },
        ]);
        const badge = document.querySelector('#notifications-btn .notification-badge');
        expect(badge).toBeTruthy();
        expect(badge.textContent).toBe('2');
        expect(badge.style.display).not.toBe('none');
    });

    it('hides the badge and shows an empty state when there are no events', () => {
        renderInbox([]);
        const badge = document.querySelector('#notifications-btn .notification-badge');
        expect(badge.style.display).toBe('none');
        expect(document.querySelector('#notifications-list .dropdown-empty')).toBeTruthy();
    });

    it('marks the unread class on unread items only', () => {
        renderInbox([
            { id: 'n1', type: 'new_episode', title: 'a', body: 'b', read: false, createdAt: Date.now() },
            { id: 'n2', type: 'new_episode', title: 'c', body: 'd', read: true, createdAt: Date.now() },
        ]);
        const items = document.querySelectorAll('[data-testid="notif-item"]');
        expect(items[0].classList.contains('unread')).toBe(true);
        expect(items[1].classList.contains('unread')).toBe(false);
    });
});
