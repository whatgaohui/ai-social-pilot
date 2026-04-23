"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSort,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableColumn<TData> {
  /** Unique key matching a property of TData */
  key: string;
  /** Column header title */
  title: string;
  /** Custom render function for cell content */
  render?: (value: unknown, row: TData) => React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Column width (CSS value) */
  width?: string;
  /** Header alignment */
  align?: "left" | "center" | "right";
}

export interface DataTableProps<TData> {
  /** Column definitions */
  columns: DataTableColumn<TData>[];
  /** Data rows */
  data: TData[];
  /** Unique identifier field (defaults to first column key) */
  rowKey?: string;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state sub-message */
  emptyDescription?: string;
  /** Custom empty state icon */
  emptyIcon?: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for table header */
  headerClassName?: string;
  /** Additional class name for table rows */
  rowClassName?: string | ((row: TData, index: number) => string);
  /** Loading state */
  loading?: boolean;
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  /** Whether rows are clickable */
  clickable?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  pageSizeOptions = [10, 20, 50],
  defaultPageSize = 10,
  emptyMessage = "暂无数据",
  emptyDescription = "没有找到匹配的记录",
  emptyIcon,
  className,
  headerClassName,
  rowClassName,
  loading = false,
  onRowClick,
  clickable = false,
  stickyHeader = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  // Build TanStack Table column definitions
  const tableColumns = React.useMemo<ColumnDef<TData, unknown>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col.key,
        header: col.title,
        size: col.width ? parseInt(col.width) : undefined,
        cell: ({ row }) => {
          const value = row.getValue(col.key);
          return col.render ? col.render(value, row.original) : String(value ?? "");
        },
      })),
    [columns]
  );

  const keyField = rowKey || columns[0]?.key || "id";

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  // Sync external pageSize state with table
  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const totalPages = table.getPageCount();
  const totalRows = data.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Table container — responsive horizontal scroll */}
      <div className="relative overflow-x-auto rounded-lg border border-border/60 bg-background">
        <table className="w-full caption-bottom text-sm">
          {/* Table Header */}
          <thead
            className={cn(
              "bg-muted/40 border-b border-border/60",
              stickyHeader && "sticky top-0 z-10",
              headerClassName
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnDef = columns[header.index];
                  const isSortable = columnDef?.sortable ?? false;
                  const sort = header.column.getIsSorted() as ColumnSort | false;
                  const align = columnDef?.align || "left";

                  return (
                    <th
                      key={header.id}
                      style={columnDef?.width ? { width: columnDef.width } : undefined}
                      className={cn(
                        "h-10 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap transition-colors",
                        align === "center" && "text-center",
                        align === "right" && "text-right",
                        isSortable &&
                          "cursor-pointer select-none hover:text-foreground hover:bg-muted/60"
                      )}
                      onClick={
                        isSortable
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1.5",
                          align === "center" && "justify-center",
                          align === "right" && "justify-end"
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {isSortable && (
                          <span className="flex flex-col items-center">
                            {sort === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-violet-500" />
                            ) : sort === "desc" ? (
                              <ArrowDown className="h-3 w-3 text-violet-500" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Table Body */}
          <tbody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <motion.tr
                    key={`loading-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border/40"
                  >
                    {columns.map((col, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={columns.length}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/80">
                        {emptyIcon || <Inbox className="h-5 w-5 text-muted-foreground/60" />}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {emptyMessage}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {emptyDescription}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rowData = row.original;
                  const rowIdx = row.index;
                  const dynamicClassName =
                    typeof rowClassName === "function"
                      ? rowClassName(rowData, rowIdx)
                      : rowClassName;

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: rowIdx * 0.02 }}
                      className={cn(
                        "border-b border-border/40 last:border-0 transition-colors",
                        "hover:bg-muted/40",
                        clickable && "cursor-pointer",
                        dynamicClassName
                      )}
                      onClick={
                        clickable && onRowClick
                          ? () => onRowClick(rowData)
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => {
                        const colDef = columns[cell.column.getIndex()];
                        const align = colDef?.align || "left";
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-3 py-2.5 text-sm",
                              align === "center" && "text-center",
                              align === "right" && "text-right"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalRows > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          {/* Row count info */}
          <div className="text-xs text-muted-foreground">
            共{" "}
            <span className="font-medium text-foreground tabular-nums">
              {totalRows}
            </span>{" "}
            条记录，第{" "}
            <span className="font-medium text-foreground tabular-nums">
              {pageIndex + 1}
            </span>{" "}
            / {totalPages} 页
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <Select
              value={String(currentPageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-7 w-[72px] text-xs" aria-label="每页条数">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size} 条
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Navigation buttons */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="第一页"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="上一页"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="下一页"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="最后一页"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
