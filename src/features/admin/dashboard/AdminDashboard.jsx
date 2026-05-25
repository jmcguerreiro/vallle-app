import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { IconChevronLeft, IconChevronRight } from '@/utils/icons'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Component: AdminDashboard
 * Super admin home page. Shows platform-level stats (companies, voucher amount,
 * commission revenue) and a yearly line chart of vouchers vs commissions broken down by month.
 * @component
 * @returns {JSX.Element}
 */
const AdminDashboard = () => {
  // Hooks
  const { t } = useTranslation()
  const { user } = useAuth()
  const { setHeader } = useMain()
  const { addToast } = useToast()

  // State
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(() => new Date().getFullYear())

  // Derived State
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const chartData = useMemo(() => {
    if (!data?.chartData) return []
    return data.chartData.map((d) => ({
      ...d,
      label: MONTH_LABELS[Number.parseInt(d.month.split('-')[1], 10) - 1],
      voucher_amount: d.voucher_amount / 100,
      commission_amount: d.commission_amount / 100,
    }))
  }, [data])

  // Handlers
  const fetchDashboard = useCallback(async (fetchYear) => {
    try {
      setIsLoading(true)
      const response = await get(`/api/admin/dashboard?year=${fetchYear}`)
      setData(response.data)
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handlePrevYear = useCallback(() => {
    setYear((prev) => prev - 1)
  }, [])

  const handleNextYear = useCallback(() => {
    setYear((prev) => prev + 1)
  }, [])

  // Effects
  useEffect(() => {
    setHeader()
  }, [setHeader])

  useEffect(() => {
    fetchDashboard(year)
  }, [fetchDashboard, year])

  // Render
  if (isLoading && !data) {
    return <div className="c-admin-dashboard"><p>{t('common.loading')}</p></div>
  }

  if (!data) return null

  return (
    <div className="c-admin-dashboard">
      <div className="c-admin-dashboard__welcome">
        <h2 className="c-admin-dashboard__heading">
          {t('features.adminDashboard.welcome', { name: user?.name })}
        </h2>
        <p className="c-admin-dashboard__subtitle">
          {t('features.adminDashboard.subtitle')}
        </p>
      </div>

      <div className="c-stats__cards c-stats__cards--3">
        <div className="c-stats__card">
          <span className="c-stats__card-value">{data.storeCount}</span>
          <span className="c-stats__card-label">{t('features.adminDashboard.stats.clients')}</span>
        </div>
        <div className="c-stats__card">
          <span className="c-stats__card-value">{formatCurrency(data.totalVoucherAmount)}</span>
          <span className="c-stats__card-label">{t('features.adminDashboard.stats.voucherAmount')}</span>
        </div>
        <div className="c-stats__card">
          <span className="c-stats__card-value">{formatCurrency(data.totalCommission)}</span>
          <span className="c-stats__card-label">{t('features.adminDashboard.stats.commission')}</span>
        </div>
      </div>

      <div className="c-stats__chart">
        <div className="c-stats__chart-header">
          <h3 className="c-stats__chart-title">{t('features.adminDashboard.chart.title')}</h3>
          <div className="c-stats__year-nav">
            <button
              className="c-stats__year-btn"
              onClick={handlePrevYear}
              type="button"
            >
              <IconChevronLeft size={18} />
            </button>
            <span className="c-stats__year-label">{year}</span>
            <button
              className="c-stats__year-btn"
              disabled={year >= currentYear}
              onClick={handleNextYear}
              type="button"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Legend />
              <Line
                dataKey="voucher_amount"
                name={t('features.adminDashboard.chart.vouchers')}
                stroke="#C4653A"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="commission_amount"
                name={t('features.adminDashboard.chart.commissions')}
                stroke="#7A9B76"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
