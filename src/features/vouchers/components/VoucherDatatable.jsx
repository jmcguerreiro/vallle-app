import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import Datatable from '@/components/Datatable'
import { voucherPath, voucherRedeemPath } from '@/constants/routes'
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
 * @param {React.ReactNode} [props.filters] - Optional filter controls
 * @param {number} [props.pageSize] - Rows per page
 * @param {Object} [props.serverPagination] - Server-side pagination config
 * @returns {JSX.Element}
 */
const VoucherDatatable = ({ vouchers, filters, pageSize, serverPagination }) => {
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
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const v = row.original
        if (v.status !== 'active' || v.balance === 0) return null
        return (
          <Button
            onClick={(event) => {
              event.stopPropagation()
              navigate(voucherRedeemPath(v.id), { state: { backgroundLocation: location } })
            }}
            size="sm"
            skin="primary"
            variant="outline"
          >
            {t('features.vouchers.redeem.submit')}
          </Button>
        )
      },
    },
  ], [t, navigate, location])

  // Handlers
  const handleRowClick = useCallback((voucher) => {
    navigate(voucherPath(voucher.id), { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Render
  return (
    <Datatable
      columns={columns}
      data={vouchers}
      filters={filters}
      onRowClick={handleRowClick}
      pageSize={pageSize}
      serverPagination={serverPagination}
    />
  )
}

export default VoucherDatatable
