import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Plus as IconPlus } from 'lucide-react'

import Datatable from '@/components/Datatable'
import { COMPANY_CATEGORIES } from '@/constants/company-categories'
import { ROUTES, adminCompanyEditPath, adminCompanyPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useRefresh } from '@/hooks/useRefresh'
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
  const { refreshKey } = useRefresh()
  const { addToast } = useToast()

  // State
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value)
  }, [])

  const handleCategoryFilter = useCallback((event) => {
    setCategoryFilter(event.target.value)
  }, [])

  // Derived State
  const filteredCompanies = useMemo(() => {
    let result = companies
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter)
    }
    return result
  }, [companies, statusFilter, categoryFilter])

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
  }, [fetchCompanies, refreshKey])

  // Render
  if (isLoading) {
    return <div className="c-admin-companies"><p>{t('common.loading')}</p></div>
  }

  const companyFilters = (
    <div className="c-datatable__filter-group">
      <select
        className="c-datatable__filter-select"
        onChange={handleStatusFilter}
        value={statusFilter}
      >
        <option value="all">{t('common.filters.allStatuses')}</option>
        <option value="active">{t('features.admin.companies.list.active')}</option>
        <option value="suspended">{t('features.admin.companies.list.suspended')}</option>
        <option value="inactive">{t('features.admin.companies.list.inactive')}</option>
      </select>
      <select
        className="c-datatable__filter-select"
        onChange={handleCategoryFilter}
        value={categoryFilter}
      >
        <option value="all">{t('common.filters.allCategories')}</option>
        {COMPANY_CATEGORIES.map((key) => (
          <option key={key} value={key}>{t(`constants.companyCategories.${key}`)}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="c-admin-companies">
      <Datatable
        columns={columns}
        data={filteredCompanies}
        filters={companyFilters}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminCompaniesIndex
