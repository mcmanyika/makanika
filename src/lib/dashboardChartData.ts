import { getRevenueEntries } from "@/lib/revenue";
import { REPAIR_STATUS_LABELS, toDate } from "@/lib/utils";
import {
  Appointment,
  Invoice,
  Payment,
  RepairOrder,
  RepairOrderStatus,
} from "@/types";

export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
}

export interface StatusCountPoint {
  status: RepairOrderStatus;
  label: string;
  count: number;
  fill: string;
}

export interface DailyCountPoint {
  label: string;
  count: number;
}

/** Monochrome slate scale for chart segments */
const STATUS_COLORS: Record<RepairOrderStatus, string> = {
  received: "#cbd5e1",
  diagnosing: "#94a3b8",
  waiting_approval: "#64748b",
  in_progress: "#475569",
  completed: "#334155",
  ready_for_pickup: "#1e293b",
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}

/** Last N calendar months of collected revenue (payments + paid invoices). */
export function buildMonthlyRevenue(
  payments: Payment[],
  invoices: Invoice[],
  months = 6,
  now: Date = new Date()
): MonthlyRevenuePoint[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }

  const totals = new Map<string, number>(keys.map((k) => [k, 0]));

  for (const entry of getRevenueEntries(payments, invoices)) {
    const key = monthKey(entry.date);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + entry.amount);
    }
  }

  return keys.map((key) => ({
    month: formatMonthLabel(key),
    revenue: Math.round((totals.get(key) ?? 0) * 100) / 100,
  }));
}

export function buildRepairOrderStatusBreakdown(
  repairOrders: RepairOrder[]
): StatusCountPoint[] {
  const counts = new Map<RepairOrderStatus, number>();

  for (const order of repairOrders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  return (Object.keys(REPAIR_STATUS_LABELS) as RepairOrderStatus[])
    .map((status) => ({
      status,
      label: REPAIR_STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
      fill: STATUS_COLORS[status],
    }))
    .filter((row) => row.count > 0);
}

/** Appointment counts per day for the last 7 days (scheduled/confirmed/in_progress). */
export function buildWeeklyAppointments(
  appointments: Appointment[],
  days = 7,
  now: Date = new Date()
): DailyCountPoint[] {
  const activeStatuses = new Set([
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
  ]);

  const points: DailyCountPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const count = appointments.filter((apt) => {
      if (!activeStatuses.has(apt.status)) return false;
      const when = toDate(apt.scheduledAt);
      return when >= start && when < end;
    }).length;

    points.push({
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day),
      count,
    });
  }

  return points;
}
