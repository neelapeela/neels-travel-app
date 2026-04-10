import { useCallback, useRef } from 'react'

/**
 * Small in-memory request cache scoped to the current React session.
 * Useful for repeated lookups (geocode, reverse-geocode, external API fetches).
 */
export function useRequestCache() {
  const cacheRef = useRef(new Map())

  const getOrSet = useCallback(async (key, loader) => {
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key)
    }
    const value = await loader()
    cacheRef.current.set(key, value)
    return value
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  return { getOrSet, clear }
}
