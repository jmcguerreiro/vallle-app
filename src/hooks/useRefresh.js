import { useContext } from 'react'

import { RefreshContext } from '@/contexts/refresh'

/**
 * Hook: useRefresh
 * Provides access to the shared refresh key and trigger.
 * List pages use refreshKey as a fetch dependency; modal forms
 * call triggerRefresh() after successful mutations.
 * Must be used within a RefreshProvider.
 * @returns {{ refreshKey: number, triggerRefresh: Function }}
 */
export const useRefresh = () => {
  const context = useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
