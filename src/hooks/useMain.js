import { useContext } from 'react'

import { MainContext } from '@/contexts/main'

/**
 * Hook: useMain
 * Provides access to main layout state and actions.
 * Must be used within a MainProvider.
 * @returns {{ header: { title: string, description: string, image: string, actions: Array }, setHeader: Function }}
 */
export const useMain = () => {
  const context = useContext(MainContext)
  if (!context) {
    throw new Error('useMain must be used within a MainProvider')
  }
  return context
}
