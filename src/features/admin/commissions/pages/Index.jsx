import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import Datatable from '@/components/Datatable'
import FilterSelect from '@/components/forms/FilterSelect'
import { adminCommissionsDetailPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

/**
 * Component: AdminCommissionsIndex
 * Shows a commission overview per company — total earnings, commissions, and outstanding balance.
 * Clicking a row opens the company's monthly commission detail modal.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsIndex = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader } = useMain()
  const { addToast } = useToast()

  // State
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Queries
  const { data: response, isPending, isError } = useQuery({
    queryKey: ['admin', 'commissions'],
    queryFn: ({ signal }) => get('/api/admin/commissions', { signal }),
  })

  const companies = useMemo(() => response?.data ?? [], [response])

  // Handlers
  const handleRowClick = useCallback((row) => {
    navigate(adminCommissionsDetailPath(row.store_id), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handlePaymentFilter = useCallback((event) => {
    setPaymentFilter(event.target.value)
  }, [])

  // Derived State
  const filteredCompanies = useMemo(() => {
    if (paymentFilter === 'all') return companies
    if (paymentFilter === 'unpaid') return companies.filter((c) => c.total_unpaid > 0)
    return companies.filter((c) => c.total_unpaid === 0)
  }, [companies, paymentFilter])

  const columns = useMemo(() => [
    {
      accessorKey: 'store_name',
      header: t('features.admin.commissions.company'),
    },
    {
      accessorKey: 'total_voucher_amount',
      header: t('features.admin.commissions.voucherSales'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'total_commission',
      header: t('features.admin.commissions.totalCommission'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'total_paid',
      header: t('features.admin.commissions.totalPaid'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'total_unpaid',
      header: t('features.admin.commissions.outstanding'),
      cell: ({ getValue }) => {
        const amount = getValue()
        return (
          <span className={amount > 0 ? 'c-admin-amount--unpaid' : 'c-admin-amount--paid'}>
            {formatCurrency(amount)}
          </span>
        )
      },
    },
    {
      accessorKey: 'last_paid_at',
      header: t('features.admin.commissions.lastPaid'),
      cell: ({ getValue }) => getValue() ? formatDate(getValue()) : '—',
    },
  ], [t])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.commissions.heading'),
      description: t('features.admin.commissions.description'),
      image: 'commissions',
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    if (isError) addToast(t('features.admin.commissions.error.generic'), 'error')
  }, [isError, addToast, t])

  // Render
  if (isPending) {
    return <div className="c-admin-commissions"><p>{t('common.loading')}</p></div>
  }

  const commissionFilters = (
    <div className="c-datatable__filter-group">
      <FilterSelect
        ariaLabel={t('common.filters.allStatuses')}
        onChange={handlePaymentFilter}
        options={[
          { value: 'all', label: t('common.filters.allStatuses') },
          { value: 'unpaid', label: t('features.admin.commissions.unpaid') },
          { value: 'paid', label: t('features.admin.commissions.paid') },
        ]}
        value={paymentFilter}
      />
    </div>
  )

  return (
    <div className="c-admin-commissions">
      <Datatable
        columns={columns}
        data={filteredCompanies}
        filters={commissionFilters}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminCommissionsIndex
