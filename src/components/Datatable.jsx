import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Search } from "lucide-react";

import Button from "@/components/Button";

/**
 * Component: Datatable
 * Reusable datatable built on TanStack Table.
 * Provides global search, column sorting, and pagination out of the box.
 * Supports both client-side and server-side pagination.
 * @component
 * @param {Object} props
 * @param {Array} props.columns - TanStack column definitions
 * @param {Array} props.data - Row data array
 * @param {number} [props.pageSize=10] - Rows per page
 * @param {Function} [props.onRowClick] - Optional row click handler, receives the row's original data
 * @param {React.ReactNode} [props.filters] - Optional filter controls rendered in the toolbar
 * @param {Array<{label: string, icon: Component, onClick: Function, skin?: string}>} [props.actions] - Optional icon-only action buttons rendered in the toolbar. `label` is used as the tooltip and aria-label.
 * @param {string} [props.className] - Additional CSS class
 * @param {Object} [props.serverPagination] - Server-side pagination config
 * @param {number} props.serverPagination.total - Total record count from the server
 * @param {number} props.serverPagination.pageIndex - Current zero-based page index
 * @param {Function} props.serverPagination.onPageChange - Callback receiving the new page index
 * @returns {JSX.Element}
 */
const Datatable = ({
  columns,
  data,
  pageSize = 2,
  onRowClick,
  filters,
  actions,
  className = "",
  serverPagination,
}) => {
  // Hooks
  const { t } = useTranslation();

  // State
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  // Derived State
  const isServerPaginated = !!serverPagination;
  const serverPageCount = isServerPaginated
    ? Math.ceil(serverPagination.total / pageSize)
    : undefined;

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
      ...(isServerPaginated && {
        pagination: { pageIndex: serverPagination.pageIndex, pageSize },
      }),
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServerPaginated ? undefined : getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: isServerPaginated
      ? undefined
      : getPaginationRowModel(),
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
  const handleSearchChange = useCallback((event) => {
    setGlobalFilter(event.target.value);
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      if (onRowClick) {
        onRowClick(row.original);
      }
    },
    [onRowClick],
  );

  const handleRowKeyDown = useCallback(
    (event, row) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRowClick(row);
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

  // Render
  return (
    <div className={`c-datatable${className ? ` ${className}` : ""}`}>
      <div className="c-datatable__toolbar">
        <div className="c-datatable__toolbar-search">
          <Search className="c-datatable__toolbar-search-icon" size={16} />
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
        {actions && actions.length > 0 && (
          <div className="c-datatable__toolbar-actions">
            {actions.map(({ label, icon: Icon, onClick, skin }) => (
              <Button
                key={label}
                ariaLabel={label}
                iconLeft={Icon}
                onClick={onClick}
                skin={skin}
                tooltip={label}
                variant="icon"
              />
            ))}
          </div>
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
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const hideOnMobile =
                      cell.column.columnDef.meta?.hideOnMobile;
                    return (
                      <td
                        key={cell.id}
                        className={`c-datatable__td${hideOnMobile ? " c-datatable__td--hide-mobile" : ""}`}
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
            className="c-btn c-btn--secondary c-datatable__pagination-btn"
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
            {t("common.pagination.previous")}
          </button>
          <span className="c-datatable__pagination-info">
            {t("common.pagination.page", {
              current: currentPage,
              total: pageCount,
            })}
          </span>
          <button
            className="c-btn c-btn--secondary c-datatable__pagination-btn"
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
            {t("common.pagination.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Datatable;
