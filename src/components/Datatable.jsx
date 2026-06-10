import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";

import Button from "@/components/Button";
import { IconArrowLeft, IconArrowRight, IconSearch } from "@/utils/icons";

/**
 * Component: Datatable
 * Reusable datatable built on TanStack Table.
 * Provides global search, column sorting, and pagination out of the box.
 * Supports both client-side and server-side pagination.
 * @component
 * @param {Object} props
 * @param {Array} props.columns - TanStack column definitions
 * @param {Array} props.data - Row data array
 * @param {number} [props.pageSize=25] - Rows per page
 * @param {Function} [props.onRowClick] - Optional row click handler, receives the row's original data
 * @param {React.ReactNode} [props.filters] - Optional filter controls rendered in the toolbar
 * @param {Array<{label: string, icon: Component, onClick: Function, skin?: string}>} [props.actions] - Optional icon-only action buttons rendered in the toolbar. `label` is used as the tooltip and aria-label.
 * @param {string} [props.className] - Additional CSS class
 * @param {Object} [props.serverPagination] - Server-side pagination config
 * @param {number} props.serverPagination.total - Total record count from the server
 * @param {number} props.serverPagination.pageIndex - Current zero-based page index
 * @param {Function} props.serverPagination.onPageChange - Callback receiving the new page index
 * @param {Object} [props.serverSearch] - Server-side search config. When provided, local filtering is disabled and the search input is debounced before firing `onChange`.
 * @param {string} props.serverSearch.value - Initial search value
 * @param {Function} props.serverSearch.onChange - Callback receiving the new (trimmed) search value after the debounce delay
 * @param {number} [props.debounceMs=300] - Debounce delay (ms) for the server search input. Only applies when `serverSearch` is provided.
 * @param {Object} [props.serverSort] - Server-side sort config. When provided, sorting is controlled by the parent and the local sort model is disabled.
 * @param {string} props.serverSort.id - Currently sorted column id
 * @param {boolean} props.serverSort.desc - Sort direction (true = descending)
 * @param {Function} props.serverSort.onChange - Callback receiving `{ id, desc }` when the user changes the sort
 * @returns {JSX.Element}
 */
const Datatable = ({
  columns,
  data,
  pageSize = 25,
  onRowClick,
  filters,
  actions,
  className = "",
  serverPagination,
  serverSearch,
  serverSort,
  debounceMs = 300,
}) => {
  // Hooks
  const { t } = useTranslation();

  // State
  const [localGlobalFilter, setLocalGlobalFilter] = useState("");
  const [searchInput, setSearchInput] = useState(serverSearch?.value ?? "");
  const [sorting, setSorting] = useState([]);

  // Derived State
  const isServerPaginated = !!serverPagination;
  const isServerSearch = !!serverSearch;
  const isServerSort = !!serverSort;
  const globalFilter = isServerSearch ? searchInput : localGlobalFilter;
  const sortingState = isServerSort
    ? [{ id: serverSort.id, desc: serverSort.desc }]
    : sorting;
  const serverPageCount = isServerPaginated
    ? Math.ceil(serverPagination.total / pageSize)
    : undefined;

  const handleSortingChange = useCallback(
    (updater) => {
      if (isServerSort) {
        const current = [{ id: serverSort.id, desc: serverSort.desc }];
        const next = typeof updater === "function" ? updater(current) : updater;
        const first = next[0];
        // TanStack cycles asc → desc → none. Treat "none" as reverting to the current column desc.
        const resolved = first
          ? { id: first.id, desc: !!first.desc }
          : { id: serverSort.id, desc: true };
        serverSort.onChange(resolved);
        return;
      }
      setSorting(updater);
    },
    [isServerSort, serverSort],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting: sortingState,
      ...(isServerPaginated && {
        pagination: { pageIndex: serverPagination.pageIndex, pageSize },
      }),
    },
    onGlobalFilterChange: isServerSearch
      ? setSearchInput
      : setLocalGlobalFilter,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel:
      isServerSearch || isServerPaginated ? undefined : getFilteredRowModel(),
    getSortedRowModel: isServerSort ? undefined : getSortedRowModel(),
    getPaginationRowModel: isServerPaginated
      ? undefined
      : getPaginationRowModel(),
    ...(isServerSort && { manualSorting: true }),
    ...(isServerPaginated
      ? { manualPagination: true, pageCount: serverPageCount }
      : { initialState: { pagination: { pageSize } } }),
  });

  const pageCount = isServerPaginated ? serverPageCount : table.getPageCount();
  const currentPage =
    (isServerPaginated
      ? serverPagination.pageIndex
      : table.getState().pagination.pageIndex) + 1;

  // Handlers
  const handleSearchChange = useCallback(
    (event) => {
      if (isServerSearch) {
        setSearchInput(event.target.value);
      } else {
        setLocalGlobalFilter(event.target.value);
      }
    },
    [isServerSearch],
  );

  const handleRowClick = useCallback(
    (event, row) => {
      if (onRowClick) {
        // Drop focus from the row before it opens a route modal. Otherwise the
        // row keeps focus inside the background subtree the modal marks
        // aria-hidden, which assistive tech blocks.
        event.currentTarget?.blur();
        onRowClick(row.original);
      }
    },
    [onRowClick],
  );

  const handleRowKeyDown = useCallback(
    (event, row) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRowClick(event, row);
      }
    },
    [handleRowClick],
  );

  // Derived State
  const sortIndicator = useMemo(
    () => ({
      asc: " ↑",
      desc: " ↓",
    }),
    [],
  );

  // Effects
  useEffect(() => {
    if (!isServerSearch) return;
    const handle = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== serverSearch.value) {
        serverSearch.onChange(trimmed);
      }
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [searchInput, isServerSearch, serverSearch, debounceMs]);

  // Render
  return (
    <div className={`c-datatable${className ? ` ${className}` : ""}`}>
      <div className="c-datatable__toolbar">
        {actions && actions.length > 0 && (
          <div className="c-datatable__toolbar-actions">
            {actions.map(({ label, icon: Icon, onClick, skin }) => (
              <Button
                key={label}
                ariaLabel={label}
                icon={Icon}
                onClick={onClick}
                skin={skin}
                tooltip={label}
                variant="icon"
              />
            ))}
          </div>
        )}
        <div className="c-datatable__toolbar-search">
          <IconSearch className="c-datatable__toolbar-search-icon" size={16} />
          <input
            className="c-datatable__toolbar-search-input"
            onChange={handleSearchChange}
            placeholder={t("common.search")}
            type="text"
            value={globalFilter}
          />
        </div>
        {filters && (
          <div className="c-datatable__toolbar-filters">{filters}</div>
        )}
      </div>

      <div className="c-datatable__table-wrapper">
        <table className="c-datatable__table">
          <thead className="c-datatable__thead">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="c-datatable__header-row">
                {headerGroup.headers.map((header) => {
                  const hideOnMobile =
                    header.column.columnDef.meta?.hideOnMobile;
                  return (
                    <th
                      key={header.id}
                      className={`c-datatable__th${header.column.getCanSort() ? " c-datatable__th--sortable" : ""}${hideOnMobile ? " c-datatable__th--hide-mobile" : ""}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sortIndicator[header.column.getIsSorted()] ?? ""}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="c-datatable__tbody">
            {table.getRowModel().rows.length === 0 ? (
              <tr className="c-datatable__row c-datatable__row--empty">
                <td
                  className="c-datatable__td"
                  colSpan={table.getVisibleLeafColumns().length}
                >
                  {t("common.noResults")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`c-datatable__row${onRowClick ? " c-datatable__row--clickable" : ""}`}
                  onClick={(event) => handleRowClick(event, row)}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const hideOnMobile =
                      cell.column.columnDef.meta?.hideOnMobile;
                    const tdClassName = cell.column.columnDef.meta?.tdClassName;
                    return (
                      <td
                        key={cell.id}
                        className={`c-datatable__td${hideOnMobile ? " c-datatable__td--hide-mobile" : ""}${tdClassName ? ` ${tdClassName}` : ""}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="c-datatable__pagination">
          <button
            aria-label={t("common.pagination.previous")}
            className="c-datatable__pagination-btn"
            disabled={
              isServerPaginated
                ? serverPagination.pageIndex === 0
                : !table.getCanPreviousPage()
            }
            onClick={() => {
              if (isServerPaginated) {
                serverPagination.onPageChange(serverPagination.pageIndex - 1);
              } else {
                table.previousPage();
              }
            }}
            type="button"
          >
            <IconArrowLeft size={20} strokeWidth="1.5" />
          </button>
          <span className="c-datatable__pagination-info">
            {t("common.pagination.page", {
              current: currentPage,
              total: pageCount,
            })}
          </span>
          <button
            aria-label={t("common.pagination.next")}
            className="c-datatable__pagination-btn"
            disabled={
              isServerPaginated
                ? currentPage >= pageCount
                : !table.getCanNextPage()
            }
            onClick={() => {
              if (isServerPaginated) {
                serverPagination.onPageChange(serverPagination.pageIndex + 1);
              } else {
                table.nextPage();
              }
            }}
            type="button"
          >
            <IconArrowRight size={20} strokeWidth="1.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Datatable;
