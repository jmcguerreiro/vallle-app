import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { vallleCreatePath } from "@/constants/routes";
import VallleDatatable from "@/features/vallles/components/VallleDatatable";
import { deriveVallleStatus } from "@/features/vallles/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { IconMailPlus } from "@/utils/icons";

/**
 * Component: ValllesIndex
 * Displays the vallle list in a datatable with status filtering.
 * Fetches vallles from the API on mount and sets the page header
 * title and actions via MainContext.
 * @component
 * @returns {JSX.Element}
 */
const ValllesIndex = () => {
  // Constants
  const STATUS_ALL = "all";
  const PAGE_SIZE = 20;

  // Hooks
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isStoreSuspended } = useAuth();
  const { setHeader } = useMain();

  // State
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ id: "created_at", desc: true });

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "vallles",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        search,
        sort: sort.id,
        order: sort.desc ? "desc" : "asc",
      },
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageIndex * PAGE_SIZE),
        sort: sort.id,
        order: sort.desc ? "desc" : "asc",
      });
      if (statusFilter !== STATUS_ALL) params.set("status", statusFilter);
      if (search) params.set("search", search);
      return get(`/api/vallles?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;
  const hasActiveFilters = statusFilter !== STATUS_ALL || search !== "";

  // Derived State
  const enrichedVallles = useMemo(() => {
    const vallles = response?.data ?? [];
    return vallles.map((v) => ({ ...v, status: deriveVallleStatus(v) }));
  }, [response]);

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(vallleCreatePath(), { state: { backgroundLocation: location } });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    setPageIndex(0);
  }, []);

  const handlePageChange = useCallback((newPageIndex) => {
    setPageIndex(newPageIndex);
  }, []);

  const handleSortChange = useCallback((next) => {
    setSort(next);
    setPageIndex(0);
  }, []);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.vallles.heading"),
      description: t("features.vallles.description"),
      image: "vallles",
      actions: isStoreSuspended
        ? []
        : [
            {
              label: t("features.vallles.create.heading"),
              icon: IconMailPlus,
              onClick: handleCreate,
            },
          ],
    });
    return () => setHeader();
  }, [t, setHeader, isStoreSuspended, handleCreate]);

  // Render
  if (isPending) {
    return (
      <div className="p-vallles">
        <div className="p-vallles__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-vallles">
        <div className="p-vallles__error">
          <EmptyState description={t("common.error")} image="vallles--error" />
        </div>
      </div>
    );
  }

  if (enrichedVallles.length === 0 && !hasActiveFilters) {
    return (
      <div className="p-vallles">
        <div className="p-vallles__empty">
          <EmptyState
            description={t("features.vallles.list.empty")}
            image="vallles"
          />
        </div>
      </div>
    );
  }

  const statusFilters = (
    <FilterSelect
      ariaLabel={t("common.filters.allStatuses")}
      onChange={handleStatusFilter}
      options={[
        { value: STATUS_ALL, label: t("common.filters.allStatuses") },
        { value: "active", label: t("features.vallles.list.active") },
        { value: "used", label: t("features.vallles.list.used") },
        { value: "expired", label: t("features.vallles.list.expired") },
        { value: "archived", label: t("features.vallles.list.archived") },
      ]}
      value={statusFilter}
    />
  );

  return (
    <div className="p-vallles">
      <VallleDatatable
        filters={statusFilters}
        pageSize={PAGE_SIZE}
        serverPagination={{
          total: totalCount,
          pageIndex,
          onPageChange: handlePageChange,
        }}
        serverSearch={{
          value: search,
          onChange: handleSearchChange,
        }}
        serverSort={{
          id: sort.id,
          desc: sort.desc,
          onChange: handleSortChange,
        }}
        vallles={enrichedVallles}
      />
    </div>
  );
};

export default ValllesIndex;
