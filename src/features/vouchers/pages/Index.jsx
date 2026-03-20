import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { voucherCreatePath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import VoucherDatatable from '@/features/vouchers/components/VoucherDatatable'

// TODO: Replace with API call
const MOCK_VOUCHERS = [
  { id: '01J5A1B2C3D4E5F6G7H8J9K0', code: 'XTU-TER-T61', amount: 5000, balance: 5000, buyer: 'Maria Silva', status: 'active', created_at: '2026-01-15T10:30:00Z', expires_at: '2031-01-15T10:30:00Z' },
  { id: '01J5A2B3C4D5E6F7G8H9J0K1', code: 'KLP-MNO-P23', amount: 10000, balance: 7500, buyer: 'João Santos', status: 'active', created_at: '2026-02-01T14:00:00Z', expires_at: '2031-02-01T14:00:00Z' },
  { id: '01J5A3B4C5D6E7F8G9H0J1K2', code: 'QRS-TUV-W45', amount: 2500, balance: 0, buyer: 'Ana Costa', status: 'used', created_at: '2025-06-20T09:15:00Z', expires_at: '2030-06-20T09:15:00Z' },
  { id: '01J5A4B5C6D7E8F9G0H1J2K3', code: 'BCD-EFG-H67', amount: 7500, balance: 7500, buyer: null, status: 'expired', created_at: '2024-03-10T16:45:00Z', expires_at: '2025-03-10T16:45:00Z' },
  { id: '01J5A5B6C7D8E9F0G1H2J3K4', code: 'IJK-LMN-O89', amount: 15000, balance: 3200, buyer: 'Pedro Ferreira', status: 'active', created_at: '2026-03-01T11:00:00Z', expires_at: '2031-03-01T11:00:00Z' },
]

/**
 * Component: VouchersIndex
 * Displays the voucher list in a datatable. Sets the page header title
 * and actions via MainContext.
 * @component
 * @returns {JSX.Element}
 */
const VouchersIndex = () => {
  // Hooks
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { setHeader } = useMain()

  // State
  const [vouchers] = useState(MOCK_VOUCHERS)

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(voucherCreatePath(), { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.vouchers.heading'),
      actions: [
        {
          label: t('features.vouchers.create.heading'),
          icon: Plus,
          onClick: handleCreate,
          variant: 'primary',
        },
      ],
    })

    return () => setHeader()
  }, [t, setHeader, handleCreate])

  // Render
  return (
    <div className="c-voucher-list">
      <VoucherDatatable vouchers={vouchers} />
    </div>
  )
}

export default VouchersIndex
