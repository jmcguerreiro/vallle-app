import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'

/**
 * Component: VoucherEdit
 * Content for editing an existing voucher.
 * Sets the header title on the modal or main layout depending on context.
 * @component
 * @returns {JSX.Element}
 */
const VoucherEdit = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()

  // Derived State
  const title = t('features.vouchers.edit.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

  // Render
  return (
    <>
      <p>{t('features.vouchers.edit.comingSoon')}</p>
      <p>{`ID: ${id}`}</p>
    </>
  )
}

export default VoucherEdit
