"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTtlCache = createTtlCache;
/** Cache mémoire à expiration. Un process Node = une instance. */
function createTtlCache(ttlMs) {
    const store = new Map();
    return {
        get(key) {
            const entry = store.get(key);
            if (!entry)
                return undefined;
            if (Date.now() > entry.expiresAt) {
                store.delete(key);
                return undefined;
            }
            return entry.value;
        },
        set(key, value) {
            store.set(key, { value, expiresAt: Date.now() + ttlMs });
        },
        delete(key) {
            store.delete(key);
        },
        deleteByPrefix(prefix) {
            for (const key of store.keys()) {
                if (key.startsWith(prefix))
                    store.delete(key);
            }
        },
        deleteMatching(match) {
            for (const key of store.keys()) {
                if (match(key))
                    store.delete(key);
            }
        },
    };
}
