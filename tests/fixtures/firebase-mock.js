/**
 * Lightweight in-memory Firebase v8/compat mock for migration unit tests.
 *
 * Mirrors the slice of the API used by src/features/auth-migration.js:
 *   db.collection(path).doc(id).set(data, { merge })
 *   db.collection(path).doc(id).get()
 *   db.collection(path).get()              -> { docs }
 *   db.batch() / batch.set(ref, data, opts) / batch.commit()
 *
 * The store is exposed so tests can assert final state and seed pre-existing
 * Firestore documents (e.g. to verify union-merge semantics).
 */

export function createMockDb({ shouldFail = false } = {}) {
    const store = new Map();

    function makeDoc(path, id) {
        const key = `${path}/${id}`;
        return {
            id,
            path: key,
            async set(data, opts) {
                if (shouldFail) throw new Error('mock-firestore-write-failure');
                if (opts?.merge) {
                    store.set(key, { ...(store.get(key) || {}), ...data });
                } else {
                    store.set(key, data);
                }
            },
            async get() {
                return {
                    exists: store.has(key),
                    data: () => store.get(key),
                };
            },
        };
    }

    function makeCollection(path) {
        return {
            doc: (id) => makeDoc(path, String(id)),
            async get() {
                const prefix = `${path}/`;
                const docs = [];
                for (const [k, v] of store.entries()) {
                    if (k.startsWith(prefix)) {
                        docs.push({ id: k.slice(prefix.length), data: () => v });
                    }
                }
                return { docs, empty: docs.length === 0 };
            },
        };
    }

    return {
        store,
        collection: (path) => makeCollection(path),
        batch() {
            const ops = [];
            return {
                set(ref, data, opts) {
                    ops.push({ ref, data, opts });
                    return this;
                },
                async commit() {
                    // If any write would fail, fail the whole batch (atomic-ish).
                    for (const { ref, data, opts } of ops) {
                        await ref.set(data, opts);
                    }
                },
            };
        },
    };
}
