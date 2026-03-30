import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

import { useMain } from '@/hooks/useMain'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Component: Stats
 * Statistics page showing performance metrics for the current store.
 * Displays summary cards and an area chart of vouchers created over time.
 * @component
 * @returns {JSX.Element}
 */
const Stats = () => {
  // Hooks
  const { t } = useTranslation()
  const { setHeader } = useMain()

  // State
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Handlers
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await get('/api/stats')
      setStats(response.data)
    } catch (error_) {
      setError(error_)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    setHeader({ title: t('features.stats.heading') })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Render
  if (isLoading) {
    return (
      <div className="c-stats">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="c-stats">
        <p>{t('common.error')}</p>
      </div>
    )
  }

  return (
    <div className="c-stats">
      <div className="c-stats__cards">
        <div className="c-stats__card">
          <span className="c-stats__card-value">{stats.totalVouchers}</span>
          <span className="c-stats__card-label">{t('features.stats.totalVouchers')}</span>
        </div>
        <div className="c-stats__card">
          <span className="c-stats__card-value">{stats.activeVouchers}</span>
          <span className="c-stats__card-label">{t('features.stats.activeVouchers')}</span>
        </div>
        <div className="c-stats__card">
          <span className="c-stats__card-value">{formatCurrency(stats.totalAmount)}</span>
          <span className="c-stats__card-label">{t('features.stats.totalAmount')}</span>
        </div>
        <div className="c-stats__card">
          <span className="c-stats__card-value">{formatCurrency(stats.totalRedeemed)}</span>
          <span className="c-stats__card-label">{t('features.stats.totalRedeemed')}</span>
        </div>
      </div>

      <div className="c-stats__chart">
        <h3 className="c-stats__chart-title">{t('features.stats.chart.title')}</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                dataKey="count"
                fill="#c4653a"
                fillOpacity={0.15}
                name={t('features.stats.chart.vouchers')}
                stroke="#c4653a"
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Stats
