import { useCallback, useContext } from 'react'

import { ModalContext } from '@/contexts/modal'

const EMPTY_HEADER = { title: '', actions: [] }
const noop = () => {}

/**
 * Hook: useModal
 * Provides access to modal layout state and actions.
 * Always returns a safe object. When used outside a ModalProvider,
 * isModal is false and setHeader is a no-op.
 * @returns {{ header: { title: string, actions: Array }, setHeader: Function, isModal: boolean }}
 */
export const useModal = () => {
  const context = useContext(ModalContext)

  if (context) {
    return { ...context, isModal: true }
  }

  return { header: EMPTY_HEADER, setHeader: noop, isModal: false }
}
