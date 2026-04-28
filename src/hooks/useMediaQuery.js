import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook: useMediaQuery
 * Subscribes to a CSS media query and returns whether it currently matches.
 * @param {string} query - The media query to evaluate (e.g. '(min-width: 1024px)')
 * @returns {boolean}
 */
export const useMediaQuery = (query) => {
  const subscribe = useCallback((callback) => {
    const mql = globalThis.matchMedia(query)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }, [query])

  const getSnapshot = useCallback(
    () => globalThis.matchMedia(query).matches,
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
