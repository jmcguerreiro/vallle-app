import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'

/**
 * Component: Datatable
 * Reusable datatable built on TanStack Table.
 * Provides global search, column sorting, and pagination out of the box.
 * @component
 * @param {Object} props
 * @param {Array} props.columns - TanStack column definitions
 * @param {Array} props.data - Row data array
 * @param {number} [props.pageSize=10] - Rows per page
 * @param {Function} [props.onRowClick] - Optional row click handler, receives the row's original data
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const Datatable = ({ columns, data, pageSize = 10, onRowClick, className = '' }) => {
  // Hooks
  const { t } = useTranslation()

  // State
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([])

  // Derived State
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex + 1

  // Handlers
  const handleSearchChange = useCallback((event) => {
    setGlobalFilter(event.target.value)
  }, [])

  const handleRowClick = useCallback((row) => {
    if (onRowClick) {
      onRowClick(row.original)
    }
  }, [onRowClick])

  const handleRowKeyDown = useCallback((event, row) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(row)
    }
  }, [handleRowClick])

  // Derived State
  const sortIndicator = useMemo(() => ({
    asc: ' ↑',
    desc: ' ↓',
  }), [])

  // Render
  return (
    <div className={`c-datatable${className ? ` ${className}` : ''}`}>
      <div className="c-datatable__toolbar">
        <div className="c-datatable__search">
          <Search className="c-datatable__search-icon" size={16} />
          <input
            className="c-datatable__search-input"
            onChange={handleSearchChange}
            placeholder={t('common.search')}
            type="text"
            value={globalFilter}
          />
        </div>
      </div>

      <div className="c-datatable__table-wrapper">
        <table className="c-datatable__table">
          <thead className="c-datatable__thead">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr className="c-datatable__header-row" key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className={`c-datatable__th${header.column.getCanSort() ? ' c-datatable__th--sortable' : ''}`}
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortIndicator[header.column.getIsSorted()] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="c-datatable__tbody">
            {table.getRowModel().rows.length === 0 ? (
              <tr className="c-datatable__row c-datatable__row--empty">
                <td className="c-datatable__td" colSpan={columns.length}>
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  className={`c-datatable__row${onRowClick ? ' c-datatable__row--clickable' : ''}`}
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td className="c-datatable__td" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
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
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            {t('common.pagination.previous')}
          </button>
          <span className="c-datatable__pagination-info">
            {t('common.pagination.page', { current: currentPage, total: pageCount })}
          </span>
          <button
            className="c-btn c-btn--secondary c-datatable__pagination-btn"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            {t('common.pagination.next')}
          </button>
        </div>
      )}
    </div>
  )
}

export default Datatable
