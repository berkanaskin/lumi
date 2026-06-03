import { describe, it, expect, beforeEach } from 'vitest';
import { createMockDb } from './fixtures/firebase-mock.js';
import { unreadCount, addEvent, listEvents, markRead, markAllRead, subscribe } from '../src/lib/notif-store.js';

describe('notif-store (Phase 05-05)', () => {
    describe('unreadCount (pure)', () => {
        it('counts only unread events', () => {
            expect(unreadCount([{ read: false }, { read: true }, { read: false }])).toBe(2);
            expect(unreadCount([])).toBe(0);
            expect(unreadCount(null)).toBe(0);
        });
    });

    describe('Firestore-backed (mock db)', () => {
        let db;
        beforeEach(() => { db = createMockDb(); });

        it('addEvent writes with read:false default', async () => {
            await addEvent('u1', { type: 'evening_pick', title: 'T', body: 'B', payload: {} }, db);
            const events = await listEvents('u1', { db });
            expect(events).toHaveLength(1);
            expect(events[0].read).toBe(false);
            expect(events[0].type).toBe('evening_pick');
        });

        it('listEvents returns the items for that user', async () => {
            await addEvent('u1', { type: 'new_episode', read: false }, db);
            await addEvent('u1', { type: 'platform_change', read: false }, db);
            const events = await listEvents('u1', { db });
            expect(events.length).toBe(2);
        });

        it('markRead flips a single event', async () => {
            await addEvent('u1', { type: 'x', read: false }, db);
            let events = await listEvents('u1', { db });
            await markRead('u1', events[0].id, db);
            events = await listEvents('u1', { db });
            expect(events[0].read).toBe(true);
        });

        it('markAllRead clears every unread event', async () => {
            await addEvent('u1', { type: 'a', read: false }, db);
            await addEvent('u1', { type: 'b', read: false }, db);
            await markAllRead('u1', db);
            const events = await listEvents('u1', { db });
            expect(unreadCount(events)).toBe(0);
        });

        it('scopes events per user', async () => {
            await addEvent('u1', { type: 'a', read: false }, db);
            await addEvent('u2', { type: 'b', read: false }, db);
            expect((await listEvents('u1', { db })).length).toBe(1);
            expect((await listEvents('u2', { db })).length).toBe(1);
        });

        it('subscribe emits and reflects new events live', async () => {
            const seen = [];
            const unsub = subscribe('u1', (evts) => seen.push(evts.length), db);
            await addEvent('u1', { type: 'a', read: false }, db);
            unsub();
            // initial emit (0) + after-add emit (1)
            expect(seen[seen.length - 1]).toBeGreaterThanOrEqual(1);
        });
    });
});
