import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Plus as IconPlus } from 'lucide-react'

import Datatable from '@/components/Datatable'
import { ROUTES, adminCompanyEditPath, adminCompanyPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'

/**
 * Component: AdminCompaniesIndex
 * Lists all companies (stores) for the super admin.
 * Each row links to the company view modal.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompaniesIndex = () => {
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
  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await get('/api/admin/companies')
      setCompanies(response.data)
    } catch {
      addToast(t('features.admin.companies.error.generic'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handleRowClick = useCallback((row) => {
    navigate(adminCompanyPath(row.id), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handleCreate = useCallback(() => {
    navigate(ROUTES.ADMIN_COMPANIES_MODAL_CREATE, {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  // Derived State
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('features.admin.companies.list.name'),
    },
    {
      accessorKey: 'category',
      header: t('features.admin.companies.list.category'),
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'voucher_count',
      header: t('features.admin.companies.list.vouchers'),
    },
    {
      accessorKey: 'total_revenue',
      header: t('features.admin.companies.list.revenue'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'total_commission',
      header: t('features.admin.companies.list.commission'),
      cell: ({ getValue }) => formatCurrency(getValue()),
    },
    {
      accessorKey: 'unpaid_commission',
      header: t('features.admin.companies.list.commissionStatus'),
      cell: ({ getValue }) => {
        const hasUnpaid = getValue() > 0
        const status = hasUnpaid ? 'unpaid' : 'paid'
        return (
          <span className={`c-admin-badge c-admin-badge--${status}`}>
            {t(`features.admin.companies.list.${status}`)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: t('features.admin.companies.list.status'),
      cell: ({ getValue }) => {
        const status = getValue()
        return (
          <span className={`c-admin-badge c-admin-badge--${status}`}>
            {t(`features.admin.companies.list.${status}`)}
          </span>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: t('features.admin.companies.list.updatedAt'),
      cell: ({ getValue }) => formatDateTime(getValue()),
    },
  ], [t])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.companies.heading'),
      actions: [
        {
          label: t('features.admin.companies.create.heading'),
          icon: IconPlus,
          onClick: handleCreate,
          variant: 'primary',
        },
      ],
    })
    return () => setHeader()
  }, [setHeader, t, handleCreate])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Render
  if (isLoading) {
    return <div className="c-admin-companies"><p>{t('common.loading')}</p></div>
  }

  return (
    <div className="c-admin-companies">
      <Datatable
        columns={columns}
        data={companies}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminCompaniesIndex
