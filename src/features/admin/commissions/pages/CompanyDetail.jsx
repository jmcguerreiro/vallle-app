import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { get, patch } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Formats a YYYY-MM string into a human-readable month label.
 * @param {string} yearMonth - e.g. "2026-03"
 * @returns {string} e.g. "March 2026"
 */
function formatYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Component: AdminCommissionsCompanyDetail
 * Shows a company's monthly commission breakdown.
 * Allows marking entire months as paid in one click.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsCompanyDetail = () => {
  // Hooks
  const { t } = useTranslation()
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { triggerRefresh } = useRefresh()
  const { addToast } = useToast()

  // State
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState(null)

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const fetchData = useCallback(async () => {
    try {
      const response = await get(`/api/admin/commissions/${storeId}`)
      setData(response.data)
    } catch {
      addToast(t('features.admin.commissions.error.generic'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [storeId, addToast, t])

  const handleMarkMonthPaid = useCallback(async (yearMonth) => {
    setMarkingPaid(yearMonth)
    try {
      await patch(`/api/admin/commissions/${storeId}/${yearMonth}`)
      triggerRefresh()
      addToast(t('features.admin.commissions.markPaidSuccess'), 'success')
      await fetchData()
    } catch {
      addToast(t('features.admin.commissions.error.generic'), 'error')
    } finally {
      setMarkingPaid(null)
    }
  }, [storeId, addToast, fetchData, t, triggerRefresh])

  // Effects
  useEffect(() => {
    if (data?.store) {
      setHeader({ title: data.store.name })
    }
    return () => setHeader()
  }, [data, setHeader])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Render
  if (isLoading) {
    return <div className="c-admin-commissions-detail"><p>{t('common.loading')}</p></div>
  }

  if (!data) return null

  const { summary, months } = data

  return (
    <div className="c-admin-commissions-detail">
      <div className="c-admin-stats-grid c-admin-stats-grid--3">
        <div className="c-admin-stat">
          <span className="c-admin-stat__label">{t('features.admin.commissions.totalCommission')}</span>
          <span className="c-admin-stat__value">{formatCurrency(summary.total_commission)}</span>
        </div>
        <div className="c-admin-stat">
          <span className="c-admin-stat__label">{t('features.admin.commissions.totalPaid')}</span>
          <span className="c-admin-stat__value">{formatCurrency(summary.total_paid)}</span>
        </div>
        <div className={`c-admin-stat${summary.total_unpaid > 0 ? ' c-admin-stat--highlight' : ''}`}>
          <span className="c-admin-stat__label">{t('features.admin.commissions.outstanding')}</span>
          <span className="c-admin-stat__value">{formatCurrency(summary.total_unpaid)}</span>
        </div>
      </div>

      {months.length === 0 ? (
        <p className="c-admin-commissions-detail__empty">{t('features.admin.commissions.noMonths')}</p>
      ) : (
        <table className="c-admin-table">
          <thead>
            <tr>
              <th>{t('features.admin.commissions.month')}</th>
              <th>{t('features.admin.commissions.commissions')}</th>
              <th>{t('features.admin.commissions.amount')}</th>
              <th>{t('features.admin.commissions.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const isPaid = month.unpaid_count === 0
              return (
                <tr key={month.year_month} className={isPaid ? 'c-admin-table__row--paid' : ''}>
                  <td>{formatYearMonth(month.year_month)}</td>
                  <td>{month.commission_count}</td>
                  <td>{formatCurrency(month.total_commission)}</td>
                  <td>
                    {isPaid ? (
                      <span className="c-admin-badge c-admin-badge--paid">
                        {t('features.admin.commissions.paid')}
                      </span>
                    ) : (
                      <span className="c-admin-badge c-admin-badge--unpaid">
                        {t('features.admin.commissions.unpaid')} ({month.unpaid_count})
                      </span>
                    )}
                  </td>
                  <td className="c-admin-table__actions">
                    {!isPaid && (
                      <Button
                        isProcessing={markingPaid === month.year_month}
                        onClick={() => handleMarkMonthPaid(month.year_month)}
                        size="sm"
                        skin="primary"
                        variant="outline"
                      >
                        {t('features.admin.commissions.markPaid')}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminCommissionsCompanyDetail
