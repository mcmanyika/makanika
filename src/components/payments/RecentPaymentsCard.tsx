"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Invoice, Payment } from "@/types";
import { formatCurrency, formatDateTime, toDate } from "@/lib/utils";

type DateRange = "all" | "30d" | "90d" | "year";
type StatusFilter = "all" | "succeeded" | "failed" | "pending" | "refunded";
type SortOption = "newest" | "oldest" | "amount_desc" | "amount_asc";

interface RecentPaymentsCardProps {
  payments: Payment[];
  invoices: Invoice[];
}

const STATUS_LABELS: Record<Payment["status"], string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  pending: "Pending",
  refunded: "Refunded",
};

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function matchesDateRange(date: Date, range: DateRange): boolean {
  if (range === "all") return true;
  const now = new Date();
  if (range === "30d") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return date >= cutoff;
  }
  if (range === "90d") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    return date >= cutoff;
  }
  return date >= startOfYear(now);
}

export function RecentPaymentsCard({ payments, invoices }: RecentPaymentsCardProps) {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const invoiceById = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const inv of invoices) map.set(inv.id, inv);
    return map;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!matchesDateRange(toDate(p.createdAt), dateRange)) return false;
      if (!q) return true;
      const inv = invoiceById.get(p.invoiceId);
      const haystack = [
        inv?.invoiceNumber,
        inv?.invoiceNumber?.replace(/-/g, ""),
        formatCurrency(p.amount),
        String(p.amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      const aTime = toDate(a.createdAt).getTime();
      const bTime = toDate(b.createdAt).getTime();
      if (sort === "newest") return bTime - aTime;
      if (sort === "oldest") return aTime - bTime;
      if (sort === "amount_desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });

    return list;
  }, [payments, statusFilter, dateRange, search, sort, invoiceById]);

  const hasActiveFilters =
    search.trim() !== "" ||
    dateRange !== "all" ||
    statusFilter !== "all" ||
    sort !== "newest";

  const clearFilters = () => {
    setSearch("");
    setDateRange("all");
    setStatusFilter("all");
    setSort("newest");
  };

  if (payments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent payments</CardTitle>
          <p className="text-sm text-slate-500">
            {filtered.length} of {payments.length} payment
            {payments.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice # or amount"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="Date range"
            >
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="year">This year</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="Payment status"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="Sort payments"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No payments match your filters.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((payment) => {
              const invoice = invoiceById.get(payment.invoiceId);
              const succeeded = payment.status === "succeeded";
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                      {succeeded ? (
                        <CheckCircle2 className="h-5 w-5 text-slate-600" strokeWidth={1.75} />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {invoice?.invoiceNumber ?? "Invoice payment"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(toDate(payment.createdAt))}
                        <span className="mx-1">·</span>
                        {STATUS_LABELS[payment.status]}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-semibold ${
                      succeeded ? "text-green-700" : "text-slate-700"
                    }`}
                  >
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
