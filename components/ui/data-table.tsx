"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  /** Omit this column from the mobile card layout. */
  hideOnMobile?: boolean;
  /** Emphasize as the card title on mobile. The first primary column wins. */
  primary?: boolean;
  /** Label shown beside the value on mobile (defaults to `header`). */
  mobileLabel?: ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  /** Screen-reader caption describing the table. */
  caption?: string;
  emptyState?: ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * Responsive table: a semantic `<table>` from `md` up, and a stacked card list
 * below `md` so dense data never forces horizontal scrolling on phones.
 * Drive both layouts from one column config.
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  caption,
  emptyState,
  className,
  rowClassName,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const primaryColumn = columns.find((c) => c.primary) ?? columns[0];
  const interactive = Boolean(onRowClick);

  const rowKeyHandler = (row: T) =>
    interactive
      ? (event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRowClick?.(row);
          }
        }
      : undefined;

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(col.align && alignClass[col.align], col.headerClassName)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={getRowKey(row, index)}
                className={cn(interactive && "cursor-pointer", rowClassName?.(row))}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
                onKeyDown={rowKeyHandler(row)}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "button" : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} className={cn(col.align && alignClass[col.align], col.className)}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {data.map((row, index) => {
          const body = (
            <>
              {primaryColumn && (
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {primaryColumn.cell(row)}
                </div>
              )}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                {columns
                  .filter((col) => col.id !== primaryColumn?.id && !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.id} className="contents">
                      <dt className="text-xs text-[var(--color-text-subtle)]">
                        {col.mobileLabel ?? col.header}
                      </dt>
                      <dd className="text-right text-sm text-[var(--color-text)]">{col.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          );

          return (
            <li key={getRowKey(row, index)}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:bg-[var(--color-surface-subtle)]",
                    rowClassName?.(row),
                  )}
                >
                  {body}
                </button>
              ) : (
                <div
                  className={cn(
                    "rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4",
                    rowClassName?.(row),
                  )}
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
