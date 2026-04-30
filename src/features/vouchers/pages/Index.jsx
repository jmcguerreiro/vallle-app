import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { Plus } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import { voucherCreatePath } from "@/constants/routes";
import VoucherDatatable from "@/features/vouchers/components/VoucherDatatable";
import { isVoucherExpired } from "@/features/vouchers/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { useRefresh } from "@/hooks/useRefresh";
import { get } from "@/services/api";

const STATUS_ALL = "all";

/**
 * Derives the display status for a voucher based on its data.
 * @param {Object} voucher
 * @returns {'active'|'used'|'expired'}
 */
function deriveStatus(voucher) {
  if (voucher.status === "archived") return "archived";
  if (isVoucherExpired(voucher.expires_at)) return "expired";
  if (voucher.balance === 0) return "used";
  return "active";
}

/**
 * Component: VouchersIndex
 * Displays the voucher list in a datatable with status filtering.
 * Fetches vouchers from the API on mount and sets the page header
 * title and actions via MainContext.
 * @component
 * @returns {JSX.Element}
 */
const VouchersIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isStoreSuspended } = useAuth();
  const { setHeader } = useMain();
  const { refreshKey } = useRefresh();

  // State
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Constants
  const PAGE_SIZE = 50;

  // Derived State
  const enrichedVouchers = useMemo(
    () => vouchers.map((v) => ({ ...v, status: deriveStatus(v) })),
    [vouchers],
  );

  const filteredVouchers = useMemo(() => {
    if (statusFilter === STATUS_ALL) return enrichedVouchers;
    return enrichedVouchers.filter((v) => v.status === statusFilter);
  }, [enrichedVouchers, statusFilter]);

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(voucherCreatePath(), { state: { backgroundLocation: location } });
  }, [navigate, location]);

  const fetchVouchers = useCallback(
    async (page = 0) => {
      setIsLoading(true);
      setError(null);

      try {
        const offset = page * PAGE_SIZE;
        const { data, meta } = await get(
          `/api/vouchers?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        setVouchers(data);
        setTotalCount(meta.total);
      } catch (error_) {
        setError(error_.message || t("common.error"));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  // Effects
  useEffect(() => {
    const actions = isStoreSuspended
      ? []
      : [
          {
            label: t("features.vouchers.create.heading"),
            icon: Plus,
            onClick: handleCreate,
            variant: "primary",
          },
        ];

    setHeader({
      title: t("features.vouchers.heading"),
      subtitle: "Emite, redima ou consulte todos os vallles disponíveis.",
      actions,
    });
    return () => setHeader();
  }, [t, setHeader, handleCreate, isStoreSuspended]);

  const handlePageChange = useCallback(
    (newPageIndex) => {
      setPageIndex(newPageIndex);
      fetchVouchers(newPageIndex);
    },
    [fetchVouchers],
  );

  useEffect(() => {
    fetchVouchers(pageIndex);
  }, [fetchVouchers, refreshKey]);

  // Render
  if (isLoading) {
    return (
      <div className="p-vouchers">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-vouchers">
        <p>{t("common.error")}</p>
      </div>
    );
  }

  if (filteredVouchers.length === 0) {
    return (
      <div className="p-vouchers">
        <EmptyState
          description={t("features.vouchers.list.empty")}
          image="empty-vouchers"
        />
      </div>
    );
  }

  const statusFilters = (
    <div className="c-datatable__filter-group">
      <select
        className="c-datatable__filter-select"
        onChange={handleStatusFilter}
        value={statusFilter}
      >
        <option value={STATUS_ALL}>{t("common.filters.allStatuses")}</option>
        <option value="active">{t("features.vouchers.list.active")}</option>
        <option value="used">{t("features.vouchers.list.used")}</option>
        <option value="expired">{t("features.vouchers.list.expired")}</option>
        <option value="archived">{t("features.vouchers.list.archived")}</option>
      </select>
    </div>
  );

  return (
    <div className="p-vouchers">
      <VoucherDatatable
        filters={statusFilters}
        pageSize={PAGE_SIZE}
        serverPagination={{
          total: totalCount,
          pageIndex,
          onPageChange: handlePageChange,
        }}
        vouchers={filteredVouchers}
      />
    </div>
  );
};

export default VouchersIndex;
