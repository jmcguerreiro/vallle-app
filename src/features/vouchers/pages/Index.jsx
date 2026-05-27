import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { voucherCreatePath } from "@/constants/routes";
import VoucherDatatable from "@/features/vouchers/components/VoucherDatatable";
import { isVoucherExpired } from "@/features/vouchers/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { IconMailPlus } from "@/utils/icons";

const STATUS_ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

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

  // State
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Constants
  const PAGE_SIZE = 5;

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "vouchers",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        search: debouncedSearch,
      },
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageIndex * PAGE_SIZE),
      });
      if (statusFilter !== STATUS_ALL) params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return get(`/api/vouchers?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;
  const hasActiveFilters =
    statusFilter !== STATUS_ALL || debouncedSearch !== "";

  // Derived State
  const enrichedVouchers = useMemo(() => {
    const vouchers = response?.data ?? [];
    return vouchers.map((v) => ({ ...v, status: deriveStatus(v) }));
  }, [response]);

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(voucherCreatePath(), { state: { backgroundLocation: location } });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const handlePageChange = useCallback((newPageIndex) => {
    setPageIndex(newPageIndex);
  }, []);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.vouchers.heading"),
      description: t("features.vouchers.description"),
      image: "vouchers",
      actions: isStoreSuspended
        ? []
        : [
            {
              label: t("features.vouchers.create.heading"),
              icon: IconMailPlus,
              onClick: handleCreate,
            },
          ],
    });
    return () => setHeader();
  }, [t, setHeader, isStoreSuspended, handleCreate]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Render
  if (isPending) {
    return (
      <div className="p-vouchers">
        <div className="p-vouchers__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-vouchers">
        <div className="p-vouchers__error">
          <EmptyState description={t("common.error")} image="vouchers--error" />
        </div>
      </div>
    );
  }

  if (enrichedVouchers.length === 0 && !hasActiveFilters) {
    return (
      <div className="p-vouchers">
        <div className="p-vouchers__empty">
          <EmptyState
            description={t("features.vouchers.list.empty")}
            image="vouchers"
          />
        </div>
      </div>
    );
  }

  const statusFilters = (
    <div className="c-datatable__filter-group">
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handleStatusFilter}
        options={[
          { value: STATUS_ALL, label: t("common.filters.allStatuses") },
          { value: "active", label: t("features.vouchers.list.active") },
          { value: "used", label: t("features.vouchers.list.used") },
          { value: "expired", label: t("features.vouchers.list.expired") },
          { value: "archived", label: t("features.vouchers.list.archived") },
        ]}
        value={statusFilter}
      />
    </div>
  );

  const actions = isStoreSuspended
    ? []
    : [
        {
          label: t("features.vouchers.create.heading"),
          icon: IconMailPlus,
          onClick: handleCreate,
        },
      ];

  return (
    <div className="p-vouchers">
      <VoucherDatatable
        actions={actions}
        filters={statusFilters}
        pageSize={PAGE_SIZE}
        serverPagination={{
          total: totalCount,
          pageIndex,
          onPageChange: handlePageChange,
        }}
        serverSearch={{
          value: searchInput,
          onChange: handleSearchChange,
        }}
        vouchers={enrichedVouchers}
      />
    </div>
  );
};

export default VouchersIndex;
