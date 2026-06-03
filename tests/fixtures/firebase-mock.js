/**
 * Lightweight in-memory Firebase v8/compat mock.
 *
 * Originally for auth-migration tests; extended (Phase 05-05) with add(), orderBy(),
 * limit(), where(), update(), and onSnapshot() so notif-store + cron logic can be tested.
 *
 * Mirrors the slice of the API used by the app:
 *   db.collection(path).doc(id).set(data, { merge }) / .get() / .update(data)
 *   db.collection(path).add(data) -> { id }
 *   db.collection(path).get() -> { docs, empty }
 *   db.collection(path).orderBy(f, dir).limit(n).where(f,op,v).get()
 *   db.collection(path).onSnapshot(cb) -> unsubscribe
 *   db.batch() / batch.set(ref, data, opts) / batch.commit()
 *
 * The store is exposed so tests can assert final state and seed documents.
 */

export function createMockDb({ shouldFail = false } = {}) {
    const store = new Map();
    let autoId = 0;
    const snapListeners = []; // { prefix, cb }

    function notify(prefix) {
        for (const l of snapListeners) {
            if (prefix.startsWith(l.prefix) || l.prefix.startsWith(prefix)) {
                l.cb(buildSnapshot(l.prefix, l.query));
            }
        }
    }

    function makeDoc(path, id) {
        const key = `${path}/${id}`;
        return {
            id,
            path: key,
            async set(data, opts) {
                if (shouldFail) throw new Error('mock-firestore-write-failure');
                if (opts?.merge) store.set(key, { ...(store.get(key) || {}), ...data });
                else store.set(key, data);
                notify(path);
            },
            async update(data) {
                if (shouldFail) throw new Error('mock-firestore-write-failure');
                if (!store.has(key)) throw new Error('not-found');
                store.set(key, { ...store.get(key), ...data });
                notify(path);
            },
            async get() {
                return { id, exists: store.has(key), data: () => store.get(key) };
            },
        };
    }

    function collectDocs(prefix) {
        const docs = [];
        for (const [k, v] of store.entries()) {
            if (k.startsWith(prefix) && k.slice(prefix.length).indexOf('/') === -1) {
                docs.push({ id: k.slice(prefix.length), data: () => v, _raw: v });
            }
        }
        return docs;
    }

    function applyQuery(docs, query) {
        let out = docs.slice();
        for (const w of query.wheres || []) {
            out = out.filter((d) => {
                const val = d._raw?.[w.field];
                if (w.op === '==') return val === w.value;
                if (w.op === '!=') return val !== w.value;
                if (w.op === '>=') return val >= w.value;
                if (w.op === '<=') return val <= w.value;
                return true;
            });
        }
        if (query.orderField) {
            out.sort((a, b) => {
                const av = a._raw?.[query.orderField];
                const bv = b._raw?.[query.orderField];
                if (av === bv) return 0;
                const cmp = av < bv ? -1 : 1;
                return query.orderDir === 'desc' ? -cmp : cmp;
            });
        }
        if (typeof query.lim === 'number') out = out.slice(0, query.lim);
        return out;
    }

    function buildSnapshot(prefix, query = {}) {
        const docs = applyQuery(collectDocs(prefix), query);
        return { docs, empty: docs.length === 0, size: docs.length };
    }

    function makeCollection(path, query = { wheres: [] }) {
        const prefix = `${path}/`;
        return {
            doc: (id) => makeDoc(path, String(id)),
            async add(data) {
                if (shouldFail) throw new Error('mock-firestore-write-failure');
                const id = `auto_${++autoId}`;
                store.set(`${prefix}${id}`, data);
                notify(path);
                return { id };
            },
            where(field, op, value) {
                return makeCollection(path, { ...query, wheres: [...(query.wheres || []), { field, op, value }] });
            },
            orderBy(field, dir = 'asc') {
                return makeCollection(path, { ...query, orderField: field, orderDir: dir });
            },
            limit(n) {
                return makeCollection(path, { ...query, lim: n });
            },
            async get() {
                return buildSnapshot(prefix, query);
            },
            onSnapshot(cb) {
                const entry = { prefix, query, cb };
                snapListeners.push(entry);
                // initial emit
                cb(buildSnapshot(prefix, query));
                return () => {
                    const i = snapListeners.indexOf(entry);
                    if (i >= 0) snapListeners.splice(i, 1);
                };
            },
        };
    }

    return {
        store,
        collection: (path) => makeCollection(path),
        batch() {
            const ops = [];
            return {
                set(ref, data, opts) { ops.push({ ref, data, opts }); return this; },
                async commit() { for (const { ref, data, opts } of ops) await ref.set(data, opts); },
            };
        },
    };
}
