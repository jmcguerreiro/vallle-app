import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import Datatable from '@/components/Datatable'
import FilterSelect from '@/components/forms/FilterSelect'
import { ROUTES, adminUserPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatDateTime } from '@/utils/dates'
import { IconPlus } from '@/utils/icons'

/**
 * Component: AdminUsersIndex
 * Lists all users across all companies for the super admin.
 * @component
 * @returns {JSX.Element}
 */
const AdminUsersIndex = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader } = useMain()
  const { addToast } = useToast()

  // State
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  // Queries
  const { data: response, isPending, isError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: ({ signal }) => get('/api/admin/users', { signal }),
  })

  const users = useMemo(() => response?.data ?? [], [response])

  // Handlers
  const handleRowClick = useCallback((row) => {
    navigate(adminUserPath(row.id), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handleCreate = useCallback(() => {
    navigate(ROUTES.ADMIN_USERS_MODAL_CREATE, {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value)
  }, [])

  const handleRoleFilter = useCallback((event) => {
    setRoleFilter(event.target.value)
  }, [])

  // Derived State
  const filteredUsers = useMemo(() => {
    let result = users
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter)
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }
    return result
  }, [users, statusFilter, roleFilter])

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('features.admin.users.list.name'),
    },
    {
      accessorKey: 'email',
      header: t('features.admin.users.list.email'),
    },
    {
      accessorKey: 'role',
      header: t('features.admin.users.list.role'),
      cell: ({ getValue }) => (
        <span className={`c-admin-badge c-admin-badge--role-${getValue()}`}>
          {t(`features.admin.users.list.role_${getValue()}`)}
        </span>
      ),
    },
    {
      id: 'stores',
      header: t('features.admin.users.list.companies'),
      cell: ({ row }) => {
        const stores = row.original.stores ?? []
        if (stores.length === 0) return '—'
        return stores.map((s) => s.store_name).join(', ')
      },
    },
    {
      accessorKey: 'status',
      header: t('features.admin.users.list.status'),
      cell: ({ getValue }) => {
        const status = getValue()
        return (
          <span className={`c-admin-badge c-admin-badge--${status}`}>
            {t(`features.admin.users.list.${status}`)}
          </span>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: t('features.admin.users.list.updatedAt'),
      cell: ({ getValue }) => formatDateTime(getValue()),
    },
  ], [t])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.users.heading'),
      description: t('features.admin.users.description'),
      image: 'users',
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    if (isError) addToast(t('features.admin.users.error.generic'), 'error')
  }, [isError, addToast, t])

  // Render
  if (isPending) {
    return <div className="c-admin-users"><p>{t('common.loading')}</p></div>
  }

  const userFilters = (
    <div className="c-datatable__filter-group">
      <FilterSelect
        ariaLabel={t('common.filters.allRoles')}
        onChange={handleRoleFilter}
        options={[
          { value: 'all', label: t('common.filters.allRoles') },
          { value: 'user', label: t('features.admin.users.list.role_user') },
          { value: 'admin', label: t('features.admin.users.list.role_admin') },
          { value: 'super_admin', label: t('features.admin.users.list.role_super_admin') },
        ]}
        value={roleFilter}
      />
      <FilterSelect
        ariaLabel={t('common.filters.allStatuses')}
        onChange={handleStatusFilter}
        options={[
          { value: 'all', label: t('common.filters.allStatuses') },
          { value: 'active', label: t('features.admin.users.list.active') },
          { value: 'inactive', label: t('features.admin.users.list.inactive') },
        ]}
        value={statusFilter}
      />
    </div>
  )

  const actions = [
    {
      label: t('features.admin.users.create.heading'),
      icon: IconPlus,
      onClick: handleCreate,
    },
  ]

  return (
    <div className="c-admin-users">
      <Datatable
        actions={actions}
        columns={columns}
        data={filteredUsers}
        filters={userFilters}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default AdminUsersIndex
