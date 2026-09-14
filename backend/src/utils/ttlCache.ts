type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/** Cache mémoire à expiration. Un process Node = une instance. */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key: string) {
      store.delete(key);
    },
    deleteByPrefix(prefix: string) {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
      }
    },
    deleteMatching(match: (key: string) => boolean) {
      for (const key of store.keys()) {
        if (match(key)) store.delete(key);
      }
    },
  };
}
