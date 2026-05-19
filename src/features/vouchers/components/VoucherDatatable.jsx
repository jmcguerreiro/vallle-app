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
 * Renders a datatable of vouchers. Clicking a row opens the voucher detail
 * modal where actions like redeem live. Secondary columns (balance, dates)
 * are hidden on mobile to keep the table compact.
 * @component
 * @param {Object} props
 * @param {Array} props.vouchers - Array of voucher objects from the API
 * @param {React.ReactNode} [props.filters] - Optional filter controls
 * @param {Array} [props.actions] - Optional action buttons rendered in the toolbar (see Datatable)
 * @param {number} [props.pageSize] - Rows per page
 * @param {Object} [props.serverPagination] - Server-side pagination config
 * @returns {JSX.Element}
 */
const VoucherDatatable = ({ vouchers, filters, actions, pageSize, serverPagination }) => {
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
      meta: { hideOnMobile: true },
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
      meta: { hideOnMobile: true },
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
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: 'expires_at',
      header: t('features.vouchers.list.expiresAt'),
      cell: ({ getValue }) => formatDate(getValue()),
      meta: { hideOnMobile: true },
    },
  ], [t])

  // Handlers
  const handleRowClick = useCallback((voucher) => {
    navigate(voucherPath(voucher.id), { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Render
  return (
    <Datatable
      actions={actions}
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
