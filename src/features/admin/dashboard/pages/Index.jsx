import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import {
  IconCalendarDays,
  IconChevronLeft,
  IconChevronRight,
} from "@/utils/icons";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Component: AdminDashboardIndex
 * Super admin home page. Shows platform-level stats (companies, vallle amount,
 * commission revenue) and a yearly line chart of vallles vs commissions broken down by month.
 * @component
 * @returns {JSX.Element}
 */
const AdminDashboardIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setHeader } = useMain();

  // State
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Derived State
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const chartData = useMemo(() => {
    if (!data?.chartData) return [];
    return data.chartData.map((d) => ({
      ...d,
      label: MONTH_LABELS[Number.parseInt(d.month.split("-")[1], 10) - 1],
      vallle_amount: d.vallle_amount / 100,
      commission_amount: d.commission_amount / 100,
    }));
  }, [data]);

  // Handlers
  const fetchDashboard = useCallback(async (fetchYear) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await get(`/api/admin/dashboard?year=${fetchYear}`);
      setData(response.data);
    } catch (error_) {
      setError(error_);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePrevYear = useCallback(() => {
    setYear((prev) => prev - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setYear((prev) => prev + 1);
  }, []);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.adminDashboard.welcome", { name: user?.name }),
      description: t("features.adminDashboard.subtitle"),
      image: "dashboard-admin",
    });
    return () => setHeader();
  }, [setHeader, t, user?.name]);

  useEffect(() => {
    fetchDashboard(year);
  }, [fetchDashboard, year]);

  // Render
  if (isLoading && !data) {
    return (
      <div className="p-admin-dashboard">
        <div className="p-admin-dashboard__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-admin-dashboard">
        <div className="p-admin-dashboard__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="stats--error"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-admin-dashboard">
      <div className="p-admin-dashboard__cards">
        <Stat
          label={t("features.adminDashboard.stats.clients")}
          value={data.storeCount}
        />
        <Stat
          label={t("features.adminDashboard.stats.vallleAmount")}
          value={formatCurrency(data.totalVallleAmount)}
        />
        <Stat
          label={t("features.adminDashboard.stats.commission")}
          value={formatCurrency(data.totalCommission)}
        />
      </div>

      <Card
        action={
          <div className="p-admin-dashboard__year-nav">
            <button
              className="p-admin-dashboard__year-btn"
              onClick={handlePrevYear}
              type="button"
            >
              <IconChevronLeft size={18} />
            </button>
            <span className="p-admin-dashboard__year-label">{year}</span>
            <button
              className="p-admin-dashboard__year-btn"
              disabled={year >= currentYear}
              onClick={handleNextYear}
              type="button"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        }
        icon={IconCalendarDays}
        title={t("features.adminDashboard.chart.title")}
      >
        <div style={{ height: 300 }}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Legend />
              <Line
                dataKey="vallle_amount"
                name={t("features.adminDashboard.chart.vallles")}
                stroke="#C4653A"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="commission_amount"
                name={t("features.adminDashboard.chart.commissions")}
                stroke="#7A9B76"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboardIndex;
