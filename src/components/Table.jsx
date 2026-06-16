import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Builds the class list for a column's cell (header or body).
 * @param {Object} column - Column definition
 * @returns {string}
 */
const colClassName = (column) =>
  [
    "c-table__cell",
    column.align && column.align !== "left"
      ? `c-table__cell--${column.align}`
      : "",
    column.hideOnMobile ? "c-table__cell--hide-mobile" : "",
    column.className || "",
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Component: Table
 * Lightweight presentational table for small, static data sets rendered
 * in place. No search, sorting, or pagination — reach for Datatable when you
 * need those. Renders a `.c-table` from column definitions, with optional
 * clickable rows.
 * @component
 * @param {Object} props
 * @param {Array<{key: string, header: React.ReactNode, render?: Function, align?: 'left'|'right'|'center', hideOnMobile?: boolean, className?: string}>} props.columns
 *   Column definitions. `render(row)` returns the cell content; defaults to `row[key]`.
 * @param {Array<Object>} props.data - Row data.
 * @param {Function} [props.getRowKey] - Returns a stable key for a row. Defaults to `row.id`.
 * @param {Function} [props.onRowClick] - Row click handler receiving the row. Makes rows clickable.
 * @param {Function} [props.getRowClassName] - Returns an extra class for a row.
 * @param {React.ReactNode} [props.emptyMessage] - Shown when `data` is empty. Defaults to a generic "no results".
 * @param {string} [props.className] - Additional CSS class on the root element.
 * @returns {JSX.Element}
 */
const Table = ({
  columns,
  data,
  getRowKey,
  onRowClick,
  getRowClassName,
  emptyMessage,
  className = "",
}) => {
  // Hooks
  const { t } = useTranslation();

  // Handlers
  const handleRowClick = useCallback(
    (event, row) => {
      if (!onRowClick) return;
      // Drop focus from the row before it opens a route modal — otherwise it
      // keeps focus inside the subtree the modal marks aria-hidden.
      event.currentTarget?.blur();
      onRowClick(row);
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

  // Render
  return (
    <table className={`c-table${className ? ` ${className}` : ""}`}>
      <thead className="c-table__head">
        <tr className="c-table__row">
          {columns.map((column) => (
            <th
              key={column.key}
              className={`c-table__th ${colClassName(column)}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="c-table__body">
        {data.length === 0 ? (
          <tr className="c-table__row c-table__row--empty">
            <td className="c-table__cell" colSpan={columns.length}>
              {emptyMessage ?? t("common.noResults")}
            </td>
          </tr>
        ) : (
          data.map((row, index) => {
            const extraClass = getRowClassName?.(row);
            return (
              <tr
                key={getRowKey ? getRowKey(row) : (row.id ?? index)}
                className={`c-table__row${onRowClick ? " c-table__row--clickable" : ""}${extraClass ? ` ${extraClass}` : ""}`}
                onClick={(event) => handleRowClick(event, row)}
                onKeyDown={(event) => handleRowKeyDown(event, row)}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`c-table__td ${colClassName(column)}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export default Table;
