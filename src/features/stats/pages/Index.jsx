import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { IconChevronLeft, IconChevronRight } from "@/utils/icons";

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
 * Component: StatsIndex
 * Statistics page showing performance metrics for the current store.
 * Displays summary cards and a bar chart of vallles created per month,
 * with year navigation to browse previous years.
 * @component
 * @returns {JSX.Element}
 */
const StatsIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const { setHeader } = useMain();

  // State
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["stats", year],
    queryFn: ({ signal }) => get(`/api/stats?year=${year}`, { signal }),
    placeholderData: keepPreviousData,
  });

  const stats = response?.data;

  // Derived State
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const chartData = useMemo(() => {
    if (!stats?.chartData) return [];
    return stats.chartData.map((d) => ({
      ...d,
      label: MONTH_LABELS[Number.parseInt(d.month.split("-")[1], 10) - 1],
    }));
  }, [stats]);

  // Handlers
  const handlePrevYear = useCallback(() => {
    setYear((prev) => prev - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setYear((prev) => prev + 1);
  }, []);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.stats.heading"),
      description: t("features.stats.description"),
      image: "stats",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  if (isPending) {
    return (
      <div className="p-stats">
        <div className="p-stats__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-stats">
        <div className="p-stats__error">
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
    <div className="p-stats">
      <div className="p-stats__cards">
        <Stat
          label={t("features.stats.totalVallles")}
          value={stats.totalVallles}
        />
        <Stat
          label={t("features.stats.activeVallles")}
          value={stats.activeVallles}
        />
        <Stat
          label={t("features.stats.totalAmount")}
          value={formatCurrency(stats.totalAmount)}
        />
        <Stat
          label={t("features.stats.totalRedeemed")}
          value={formatCurrency(stats.totalRedeemed)}
        />
      </div>

      <Card
        action={
          <div className="p-stats__year-nav">
            <button
              className="p-stats__year-btn"
              onClick={handlePrevYear}
              type="button"
            >
              <IconChevronLeft size={18} />
            </button>
            <span className="p-stats__year-label">{year}</span>
            <button
              className="p-stats__year-btn"
              disabled={year >= currentYear}
              onClick={handleNextYear}
              type="button"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        }
        description={t("features.stats.chart.subtitle")}
        title={t("features.stats.chart.title")}
      >
        <div style={{ height: 300 }}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} width={40} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#c4653a"
                name={t("features.stats.chart.vallles")}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default StatsIndex;
