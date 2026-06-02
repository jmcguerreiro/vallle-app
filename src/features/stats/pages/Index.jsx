import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useQuery } from "@tanstack/react-query";
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
import { IconCalendarDays } from "@/utils/icons";

/**
 * Component: StatsIndex
 * Statistics page showing performance metrics for the current store.
 * Displays summary cards and a bar chart of vallles created over time.
 * @component
 * @returns {JSX.Element}
 */
const StatsIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const { setHeader } = useMain();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: ({ signal }) => get("/api/stats", { signal }),
  });

  const stats = response?.data;

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

      <Card icon={IconCalendarDays} title={t("features.stats.chart.title")}>
        <div style={{ height: 300 }}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={stats.chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
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
