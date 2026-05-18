import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Plus as IconPlus } from 'lucide-react'

import Button from '@/components/Button'
import Datatable from '@/components/Datatable'
import { settingsUserCreatePath, settingsUserEditPath } from '@/constants/routes'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatDateTime } from '@/utils/dates'

/**
 * Component: CompanyUsers
 * Lists users belonging to the active store. Allows admins to create and edit users.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUsers = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshKey } = useRefresh()
  const { addToast } = useToast()

  // State
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Handlers
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await get('/api/company/users')
      setUsers(response.data)
    } catch {
      addToast(t('features.company.users.error.generic'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handleRowClick = useCallback((row) => {
    navigate(settingsUserEditPath(row.id), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handleCreate = useCallback(() => {
    navigate(settingsUserCreatePath(), {
      state: { backgroundLocation: location },
    })
  }, [navigate, location])

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value)
  }, [])

  // Derived State
  const filteredUsers = useMemo(() => {
    if (statusFilter === 'all') return users
    return users.filter((u) => u.status === statusFilter)
  }, [users, statusFilter])

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('features.company.users.list.name'),
    },
    {
      accessorKey: 'email',
      header: t('features.company.users.list.email'),
    },
    {
      accessorKey: 'role',
      header: t('features.company.users.list.role'),
      cell: ({ getValue }) => (
        <span className={`c-admin-badge c-admin-badge--role-${getValue()}`}>
          {t(`features.company.users.list.role_${getValue()}`)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('features.company.users.list.status'),
      cell: ({ getValue }) => {
        const status = getValue()
        return (
          <span className={`c-admin-badge c-admin-badge--${status}`}>
            {t(`features.company.users.list.${status}`)}
          </span>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: t('features.company.users.list.updatedAt'),
      cell: ({ getValue }) => formatDateTime(getValue()),
    },
  ], [t])

  // Effects
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, refreshKey])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  const userFilters = (
    <div className="c-datatable__filter-group">
      <select
        className="c-datatable__filter-select"
        onChange={handleStatusFilter}
        value={statusFilter}
      >
        <option value="all">{t('common.filters.allStatuses')}</option>
        <option value="active">{t('features.company.users.list.active')}</option>
        <option value="inactive">{t('features.company.users.list.inactive')}</option>
      </select>
    </div>
  )

  return (
    <div className="c-company-users">
      <div className="c-company-users__header">
        <Button iconLeft={IconPlus} onClick={handleCreate} size="sm">
          {t('features.company.users.create.heading')}
        </Button>
      </div>
      <Datatable
        columns={columns}
        data={filteredUsers}
        filters={userFilters}
        onRowClick={handleRowClick}
      />
    </div>
  )
}

export default CompanyUsers
