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

import Stat from '@/components/Stat'
import { useMain } from '@/hooks/useMain'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Component: StatsIndex
 * Statistics page showing performance metrics for the current store.
 * Displays summary cards and an area chart of vouchers created over time.
 * @component
 * @returns {JSX.Element}
 */
const StatsIndex = () => {
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
      <div className="p-stats">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-stats">
        <p>{t('common.error')}</p>
      </div>
    )
  }

  return (
    <div className="p-stats">
      <div className="p-stats__cards">
        <Stat label={t('features.stats.totalVouchers')} value={stats.totalVouchers} />
        <Stat label={t('features.stats.activeVouchers')} value={stats.activeVouchers} />
        <Stat label={t('features.stats.totalAmount')} value={formatCurrency(stats.totalAmount)} />
        <Stat label={t('features.stats.totalRedeemed')} value={formatCurrency(stats.totalRedeemed)} />
      </div>

      <div className="p-stats__chart">
        <h3 className="p-stats__chart-title">{t('features.stats.chart.title')}</h3>
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

export default StatsIndex
