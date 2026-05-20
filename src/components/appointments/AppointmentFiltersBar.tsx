"use client";

import { Search } from "lucide-react";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/utils";
import { AppointmentStatus, Customer } from "@/types";

export type AppointmentDateFilter =
  | "all"
  | "upcoming"
  | "past"
  | "30d"
  | "next30d";

export type AppointmentSort = "date_asc" | "date_desc" | "customer" | "status";

interface AppointmentFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AppointmentStatus | "all";
  onStatusFilterChange: (value: AppointmentStatus | "all") => void;
  dateFilter: AppointmentDateFilter;
  onDateFilterChange: (value: AppointmentDateFilter) => void;
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
  sort: AppointmentSort;
  onSortChange: (value: AppointmentSort) => void;
  customers: Customer[];
  filteredCount: number;
  totalCount: number;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function AppointmentFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  customerFilter,
  onCustomerFilterChange,
  sort,
  onSortChange,
  customers,
  filteredCount,
  totalCount,
  onClear,
  hasActiveFilters,
}: AppointmentFiltersBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-700">Filter appointments</p>
        <p className="text-sm text-slate-500">
          {filteredCount} of {totalCount} shown
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search service, customer, or vehicle"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as AppointmentStatus | "all")
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) =>
              onDateFilterChange(e.target.value as AppointmentDateFilter)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Date"
          >
            <option value="all">All dates</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="next30d">Next 30 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <select
            value={customerFilter}
            onChange={(e) => onCustomerFilterChange(e.target.value)}
            className="max-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Customer"
          >
            <option value="all">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as AppointmentSort)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Sort"
          >
            <option value="date_asc">Soonest first</option>
            <option value="date_desc">Latest first</option>
            <option value="customer">Customer A–Z</option>
            <option value="status">Status</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
