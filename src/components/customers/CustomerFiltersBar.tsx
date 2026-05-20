"use client";

import { Search } from "lucide-react";

export type CustomerDateFilter = "all" | "30d" | "90d" | "year";
export type CustomerVehicleFilter = "all" | "with" | "without";
export type CustomerActivityFilter =
  | "all"
  | "open_ro"
  | "outstanding_invoice"
  | "upcoming_appointment";
export type CustomerSort =
  | "name_asc"
  | "name_desc"
  | "newest"
  | "oldest"
  | "vehicles_desc";

interface CustomerFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  stateFilter: string;
  onStateFilterChange: (value: string) => void;
  states: string[];
  vehicleFilter: CustomerVehicleFilter;
  onVehicleFilterChange: (value: CustomerVehicleFilter) => void;
  dateFilter: CustomerDateFilter;
  onDateFilterChange: (value: CustomerDateFilter) => void;
  activityFilter: CustomerActivityFilter;
  onActivityFilterChange: (value: CustomerActivityFilter) => void;
  sort: CustomerSort;
  onSortChange: (value: CustomerSort) => void;
  filteredCount: number;
  totalCount: number;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CustomerFiltersBar({
  search,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  states,
  vehicleFilter,
  onVehicleFilterChange,
  dateFilter,
  onDateFilterChange,
  activityFilter,
  onActivityFilterChange,
  sort,
  onSortChange,
  filteredCount,
  totalCount,
  onClear,
  hasActiveFilters,
}: CustomerFiltersBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-700">Filter customers</p>
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
            placeholder="Search name, email, phone, or location"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={stateFilter}
            onChange={(e) => onStateFilterChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="State"
          >
            <option value="all">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={vehicleFilter}
            onChange={(e) =>
              onVehicleFilterChange(e.target.value as CustomerVehicleFilter)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Vehicles"
          >
            <option value="all">All customers</option>
            <option value="with">Has vehicles</option>
            <option value="without">No vehicles</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) =>
              onDateFilterChange(e.target.value as CustomerDateFilter)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Added"
          >
            <option value="all">Any time added</option>
            <option value="30d">Added last 30 days</option>
            <option value="90d">Added last 90 days</option>
            <option value="year">Added this year</option>
          </select>

          <select
            value={activityFilter}
            onChange={(e) =>
              onActivityFilterChange(e.target.value as CustomerActivityFilter)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Activity"
          >
            <option value="all">All activity</option>
            <option value="open_ro">Open repair orders</option>
            <option value="outstanding_invoice">Outstanding invoices</option>
            <option value="upcoming_appointment">Upcoming appointments</option>
          </select>

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as CustomerSort)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="Sort"
          >
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="vehicles_desc">Most vehicles</option>
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
