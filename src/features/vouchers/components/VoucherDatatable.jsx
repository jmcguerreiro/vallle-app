import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Datatable from '@/components/Datatable'
import { voucherPath } from '@/constants/routes'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

/**
 * Maps voucher status values to i18n keys.
 */
const STATUS_KEYS = {
  active: 'features.vouchers.list.active',
  used: 'features.vouchers.list.used',
  expired: 'features.vouchers.list.expired',
}

/**
 * Component: VoucherDatatable
 * Renders a datatable of vouchers with columns for code, buyer, amount,
 * balance, status, created date, and expiry date. Clicking a row opens
 * the voucher detail modal.
 * @component
 * @param {Object} props
 * @param {Array} props.vouchers - Array of voucher objects from the API
 * @returns {JSX.Element}
 */
const VoucherDatatable = ({ vouchers }) => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // Derived State
  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: t('features.vouchers.list.code'),
    },
    {
      accessorKey: 'buyer',
      header: t('features.vouchers.list.buyer'),
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'amount',
      header: t('features.vouchers.list.amount'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'balance',
      header: t('features.vouchers.list.balance'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'status',
      header: t('features.vouchers.list.status'),
      cell: ({ getValue }) => {
        const status = getValue()
        return (
          <span className={`c-voucher-status c-voucher-status--${status}`}>
            {t(STATUS_KEYS[status])}
          </span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: t('features.vouchers.list.createdAt'),
      cell: ({ getValue }) => formatDate(getValue()),
    },
    {
      accessorKey: 'expires_at',
      header: t('features.vouchers.list.expiresAt'),
      cell: ({ getValue }) => formatDate(getValue()),
    },
  ], [t])

  // Handlers
  const handleRowClick = useCallback((voucher) => {
    navigate(voucherPath(voucher.id), { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Render
  return (
    <Datatable
      columns={columns}
      data={vouchers}
      onRowClick={handleRowClick}
    />
  )
}

export default VoucherDatatable
