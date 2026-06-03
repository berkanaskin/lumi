/**
 * LUMI — notification store (Phase 05-05).
 *
 * Client-side access to users/{uid}/notifications using Firebase v8 compat
 * (firebase.firestore()), matching the rest of src/features/*. Cron writes events
 * server-side via the Admin SDK; this module reads them, marks them read, and exposes
 * a live subscription for the bell badge.
 *
 * Firestore methods accept an injectable `db` so tests can drive them with a mock.
 * Pure helpers (unreadCount) are exported for unit tests.
 */

function defaultDb() {
    try {
        return (typeof window !== 'undefined' && window.firebase?.firestore)
            ? window.firebase.firestore()
            : null;
    } catch {
        return null;
    }
}

function serverTs() {
    try {
        return window.firebase.firestore.FieldValue.serverTimestamp();
    } catch {
        return Date.now();
    }
}

/** Pure: count unread events. */
export function unreadCount(events) {
    if (!Array.isArray(events)) return 0;
    return events.filter((e) => e && !e.read).length;
}

function col(db, uid) {
    return db.collection(`users/${uid}/notifications`);
}

/** Add an event (client-side seed / local; production writes come from cron). */
export async function addEvent(uid, event, db = defaultDb()) {
    if (!db || !uid) return null;
    const payload = { ...event, read: event?.read ?? false, createdAt: serverTs() };
    const c = col(db, uid);
    if (typeof c.add === 'function') return c.add(payload);
    // Fallback for mocks without add(): deterministic id.
    const id = `n_${(event?.type || 'evt')}_${Math.floor(Date.now())}`;
    await c.doc(id).set(payload);
    return { id };
}

/** List the most recent events (desc). */
export async function listEvents(uid, { limit = 30, db = defaultDb() } = {}) {
    if (!db || !uid) return [];
    let q = col(db, uid);
    if (typeof q.orderBy === 'function') q = q.orderBy('createdAt', 'desc');
    if (typeof q.limit === 'function') q = q.limit(limit);
    const snap = await q.get();
    const docs = (snap && snap.docs) || [];
    return docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Mark one event read. */
export async function markRead(uid, notifId, db = defaultDb()) {
    if (!db || !uid || !notifId) return;
    const ref = col(db, uid).doc(notifId);
    if (typeof ref.update === 'function') return ref.update({ read: true });
    return ref.set({ read: true }, { merge: true });
}

/** Mark every unread event read. */
export async function markAllRead(uid, db = defaultDb()) {
    if (!db || !uid) return;
    const events = await listEvents(uid, { limit: 100, db });
    await Promise.all(events.filter((e) => !e.read).map((e) => markRead(uid, e.id, db)));
}

/**
 * Live subscription to the inbox. Returns an unsubscribe fn (no-op if onSnapshot
 * is unavailable — caller can fall back to listEvents on open).
 */
export function subscribe(uid, cb, db = defaultDb()) {
    if (!db || !uid) return () => {};
    let q = col(db, uid);
    if (typeof q.orderBy === 'function') q = q.orderBy('createdAt', 'desc');
    if (typeof q.limit === 'function') q = q.limit(30);
    if (typeof q.onSnapshot !== 'function') return () => {};
    return q.onSnapshot((snap) => {
        const docs = (snap && snap.docs) || [];
        cb(docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}
