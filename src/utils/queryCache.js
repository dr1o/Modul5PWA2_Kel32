// In-memory Query Cache with TTL (Time-To-Live) and prefix invalidation
const cacheStore = new Map()
const DEFAULT_TTL_MS = 2 * 60 * 1000 // 2 minutes

export function getCachedQuery(key) {
  const entry = cacheStore.get(key)
  if (!entry) {
    console.log(`[QueryCache] MISS: ${key}`)
    return null
  }
  if (Date.now() - entry.timestamp > entry.ttl) {
    cacheStore.delete(key)
    console.log(`[QueryCache] EXPIRED: ${key}`)
    return null
  }
  console.log(`[QueryCache] HIT (served from cache): ${key}`)
  return entry.value
}

export function setCachedQuery(key, value, ttl = DEFAULT_TTL_MS) {
  cacheStore.set(key, {
    value,
    timestamp: Date.now(),
    ttl,
  })
  console.log(`[QueryCache] STORED: ${key}`)
}

export function invalidateCache(key) {
  if (cacheStore.delete(key)) {
    console.log(`[QueryCache] INVALIDATED KEY: ${key}`)
  }
}

export function invalidateCacheByPrefix(prefix) {
  let cleared = 0
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key)
      cleared++
    }
  }
  if (cleared > 0) {
    console.log(`[QueryCache] INVALIDATED ${cleared} entries for "${prefix}*"`)
  }
}