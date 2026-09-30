"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { LoadingState, EmptyState } from "./StateRenderer";

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  defaultPageSize?: number;
  actions?: React.ReactNode;
};

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyTitle,
  emptyDesc,
  searchable = true,
  searchPlaceholder,
  searchFilter,
  defaultPageSize = 25,
  actions,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number | "ALL">(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    if (searchFilter) {
      return data.filter((item) => searchFilter(item, q));
    }
    return data.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [data, search, searchFilter]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const cmp = valA > valB ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortCol, sortOrder]);

  // Pagination calculation
  const total = sortedData.length;
  const effectiveLimit = pageSize === "ALL" ? total || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * effectiveLimit;
  const paginatedData =
    pageSize === "ALL" ? sortedData : sortedData.slice(startIdx, startIdx + effectiveLimit);

  function handleSort(key?: string) {
    if (!key) return;
    if (sortCol === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortOrder("asc");
    }
  }

  const from = total === 0 ? 0 : startIdx + 1;
  const to = Math.min(startIdx + (pageSize === "ALL" ? total : pageSize), total);

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {searchable ? (
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder || t("common.search")}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            ) : null}
          </div>
        ) : (
          <div />
        )}
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {/* Table Body Container */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface shadow-sm">
        {loading ? (
          <LoadingState />
        ) : paginatedData.length === 0 ? (
          <div className="p-8">
            <EmptyState title={emptyTitle} description={emptyDesc} />
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-medium">
              <tr>
                {columns.map((col, idx) => {
                  const key = String(col.accessorKey || idx);
                  const isSorted = sortCol === key;
                  return (
                    <th
                      key={key}
                      onClick={() => col.sortable && handleSort(key)}
                      className={`p-3.5 ${col.sortable ? "cursor-pointer select-none hover:text-white" : ""} ${col.className || ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable ? (
                          <span className="text-[10px] text-slate-500">
                            {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {paginatedData.map((row, rIdx) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={String(col.accessorKey || cIdx)}
                      className={`p-3.5 ${col.className || ""}`}
                    >
                      {col.cell
                        ? col.cell(row, rIdx)
                        : col.accessorKey
                        ? String((row as any)[col.accessorKey] ?? "—")
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Pagination Footer */}
      {!loading && total > 0 ? (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400 px-1">
          <div>
            {t("common.pagination_showing", {
              from,
              to,
              total,
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector: 10, 25, 50, 100, Semua */}
            <div className="flex items-center gap-1.5">
              <span>{t("common.pagination_rows_per_page")}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                  setPageSize(val as any);
                  setPage(1);
                }}
                className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">{t("common.pagination_all")}</option>
              </select>
            </div>

            {/* Pagination Controls */}
            {pageSize !== "ALL" && totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="px-2">
                  {t("common.pagination_page", {
                    page: currentPage,
                    totalPages,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5 disabled:opacity-40"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
