import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@/components/Button'
import Datatable from '@/components/Datatable'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get, patch } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

const STATUS_ALL = 'all'
const STORE_ALL = 'all'

/**
 * Component: Commissions
 * Displays commission tracking for the super admin.
 * Lists all commissions with the ability to mark unpaid ones as paid.
 * Supports filtering by payment status and store.
 * @component
 * @returns {JSX.Element}
 */
const Commissions = () => {
  // Hooks
  const { t } = useTranslation()
  const { setHeader } = useMain()
  const { addToast } = useToast()

  // State
  const [commissions, setCommissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL)
  const [storeFilter, setStoreFilter] = useState(STORE_ALL)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Constants
  const PAGE_SIZE = 50

  // Derived State
  const storeOptions = useMemo(() => {
    const unique = [...new Set(commissions.map((c) => c.store_name))].toSorted()
    return unique
  }, [commissions])

  const filteredCommissions = useMemo(() => {
    let result = commissions

    if (statusFilter !== STATUS_ALL) {
      result = result.filter((c) =>
        statusFilter === 'paid' ? !!c.paid_at : !c.paid_at,
      )
    }

    if (storeFilter !== STORE_ALL) {
      result = result.filter((c) => c.store_name === storeFilter)
    }

    return result
  }, [commissions, statusFilter, storeFilter])

  // Handlers
  const fetchCommissions = useCallback(async (page = 0) => {
    try {
      setIsLoading(true)
      const offset = page * PAGE_SIZE
      const response = await get(`/api/commissions?limit=${PAGE_SIZE}&offset=${offset}`)
      setCommissions(response.data)
      setTotalCount(response.meta.total)
    } catch {
      addToast(t('features.commissions.error.generic'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handleMarkPaid = useCallback(async (id) => {
    try {
      await patch(`/api/commissions/${id}`)
      addToast(t('features.commissions.success'), 'success')
      fetchCommissions()
    } catch {
      addToast(t('features.commissions.error.generic'), 'error')
    }
  }, [addToast, fetchCommissions, t])

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value)
  }, [])

  const handleStoreFilter = useCallback((event) => {
    setStoreFilter(event.target.value)
  }, [])

  const columns = useMemo(() => [
    {
      accessorKey: 'store_name',
      header: t('features.commissions.store'),
    },
    {
      accessorKey: 'voucher_code',
      header: t('features.commissions.voucherCode'),
    },
    {
      accessorKey: 'amount',
      header: t('features.commissions.amount'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      id: 'status',
      header: t('features.commissions.status'),
      cell: ({ row }) => {
        const isPaid = !!row.original.paid_at
        return (
          <span className={`c-commission-status--${isPaid ? 'paid' : 'unpaid'}`}>
            {isPaid ? t('features.commissions.paid') : t('features.commissions.unpaid')}
          </span>
        )
      },
    },
    {
      accessorKey: 'paid_at',
      header: t('features.commissions.paidAt'),
      cell: ({ getValue }) => getValue() ? formatDate(getValue()) : '\u2014',
    },
    {
      accessorKey: 'created_at',
      header: t('features.commissions.date'),
      cell: ({ getValue }) => formatDate(getValue()),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.paid_at) return null
        return (
          <Button
            onClick={() => handleMarkPaid(row.original.id)}
            size="sm"
            skin="primary"
            variant="outline"
          >
            {t('features.commissions.markPaid')}
          </Button>
        )
      },
    },
  ], [t, handleMarkPaid])

  // Effects
  useEffect(() => {
    setHeader({ title: t('features.commissions.heading') })
    return () => setHeader()
  }, [setHeader, t])

  const handlePageChange = useCallback((newPageIndex) => {
    setPageIndex(newPageIndex)
    fetchCommissions(newPageIndex)
  }, [fetchCommissions])

  useEffect(() => {
    fetchCommissions(pageIndex)
  }, [fetchCommissions])

  // Render
  if (isLoading) {
    return (
      <div className="c-commissions">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  const filters = (
    <div className="c-datatable__filter-group">
      <select
        className="c-datatable__filter-select"
        onChange={handleStatusFilter}
        value={statusFilter}
      >
        <option value={STATUS_ALL}>{t('common.filters.allStatuses')}</option>
        <option value="unpaid">{t('features.commissions.unpaid')}</option>
        <option value="paid">{t('features.commissions.paid')}</option>
      </select>
      {storeOptions.length > 1 && (
        <select
          className="c-datatable__filter-select"
          onChange={handleStoreFilter}
          value={storeFilter}
        >
          <option value={STORE_ALL}>{t('common.filters.allStores')}</option>
          {storeOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}
    </div>
  )

  return (
    <div className="c-commissions">
      <Datatable
        columns={columns}
        data={filteredCommissions}
        filters={filters}
        pageSize={PAGE_SIZE}
        serverPagination={{ total: totalCount, pageIndex, onPageChange: handlePageChange }}
      />
    </div>
  )
}

export default Commissions
