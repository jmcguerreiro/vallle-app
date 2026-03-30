import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Datatable from '@/components/Datatable'
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
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Handlers
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await get('/api/admin/commissions')
      setCompanies(response.data)
    } catch {
      addToast(t('features.admin.commissions.error.generic'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handleRowClick = useCallback((row) => {
    navigate(adminCommissionsDetailPath(row.store_id), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  // Derived State
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
    setHeader({ title: t('features.admin.commissions.heading') })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Render
  if (isLoading) {
    return <div className="c-admin-commissions"><p>{t('common.loading')}</p></div>
  }

  return (
    <div className="c-admin-commissions">
      <Datatable
        columns={columns}
        data={companies}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminCommissionsIndex
