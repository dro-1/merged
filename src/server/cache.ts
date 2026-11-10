type CacheEntry<T> = { value: Promise<T>; expiresAt: number }

type TtlCacheOptions = {
  ttlMs: number
  maxEntries: number
  /** Clock source, injectable for tests. */
  now?: () => number
}

/**
 * Creates an in-memory cache that keeps each value for `ttlMs` and holds at most
 * `maxEntries`, evicting the oldest-inserted first. Concurrent lookups of a missing
 * key share a single `load` call, and a rejected load is not cached.
 */
export function createTtlCache<T>({
  ttlMs,
  maxEntries,
  now = Date.now,
}: TtlCacheOptions) {
  const entries = new Map<string, CacheEntry<T>>()

  return {
    getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
      const time = now()
      const hit = entries.get(key)
      if (hit && hit.expiresAt > time) return hit.value
      entries.delete(key)

      const value = load()
      entries.set(key, { value, expiresAt: time + ttlMs })
      value.catch(() => {
        // Only evict if a newer load hasn't replaced this entry meanwhile.
        if (entries.get(key)?.value === value) entries.delete(key)
      })

      while (entries.size > maxEntries) {
        const oldest = entries.keys().next()
        if (oldest.done) break
        entries.delete(oldest.value)
      }
      return value
    },

    get size() {
      return entries.size
    },
  }
}
