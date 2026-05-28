import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import Datatable from '@/components/Datatable'
import FilterSelect from '@/components/forms/FilterSelect'
import { COMPANY_CATEGORIES } from '@/constants/company-categories'
import { ROUTES, adminCompanyEditPath, adminCompanyPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { IconPlus } from '@/utils/icons'

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
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Queries
  const { data: response, isPending, isError } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: ({ signal }) => get('/api/admin/companies', { signal }),
  })

  const companies = useMemo(() => response?.data ?? [], [response])

  // Handlers
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
      accessorKey: 'vallle_count',
      header: t('features.admin.companies.list.vallles'),
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
      description: t('features.admin.companies.description'),
      image: 'companies',
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    if (isError) addToast(t('features.admin.companies.error.generic'), 'error')
  }, [isError, addToast, t])

  // Render
  if (isPending) {
    return <div className="c-admin-companies"><p>{t('common.loading')}</p></div>
  }

  const companyFilters = (
    <>
      <FilterSelect
        ariaLabel={t('common.filters.allStatuses')}
        onChange={handleStatusFilter}
        options={[
          { value: 'all', label: t('common.filters.allStatuses') },
          { value: 'active', label: t('features.admin.companies.list.active') },
          { value: 'suspended', label: t('features.admin.companies.list.suspended') },
          { value: 'inactive', label: t('features.admin.companies.list.inactive') },
        ]}
        value={statusFilter}
      />
      <FilterSelect
        ariaLabel={t('common.filters.allCategories')}
        onChange={handleCategoryFilter}
        options={[
          { value: 'all', label: t('common.filters.allCategories') },
          ...COMPANY_CATEGORIES.map((key) => ({
            value: key,
            label: t(`constants.companyCategories.${key}`),
          })),
        ]}
        value={categoryFilter}
      />
    </>
  )

  const actions = [
    {
      label: t('features.admin.companies.create.heading'),
      icon: IconPlus,
      onClick: handleCreate,
    },
  ]

  return (
    <div className="c-admin-companies">
      <Datatable
        actions={actions}
        columns={columns}
        data={filteredCompanies}
        filters={companyFilters}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminCompaniesIndex
