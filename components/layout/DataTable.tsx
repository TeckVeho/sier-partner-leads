"use client";

import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows = [],
  getRowKey,
  loading,
  emptyMessage = "データがありません",
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows?: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle backdrop-blur">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-3 py-2 text-[12px] font-medium text-muted", col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-muted">
                読み込み中…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/80 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-primary-light",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-3 py-2.5 text-text", col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
