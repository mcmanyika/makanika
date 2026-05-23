import { getRevenueEntries, sumRevenue } from "@/lib/revenue";
import { toDate } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  Invoice,
  Payment,
  RepairOrder,
  RepairOrderStatus,
} from "@/types";

const OPEN_REPAIR_STATUSES: RepairOrderStatus[] = [
  "received",
  "diagnosing",
  "waiting_approval",
  "in_progress",
  "completed",
];

const TODAY_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isScheduledOnDay(
  scheduledAt: Date | { toDate?: () => Date } | string,
  day: Date = new Date()
): boolean {
  const d = toDate(scheduledAt as Date);
  const start = startOfDay(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return d >= start && d < end;
}

export function getTodayAppointments(
  appointments: Appointment[],
  day: Date = new Date()
): Appointment[] {
  return appointments
    .filter(
      (a) =>
        isScheduledOnDay(a.scheduledAt, day) &&
        TODAY_APPOINTMENT_STATUSES.includes(a.status)
    )
    .sort(
      (a, b) =>
        toDate(a.scheduledAt).getTime() - toDate(b.scheduledAt).getTime()
    );
}

export function computeDashboardStats(
  repairOrders: RepairOrder[],
  invoices: Invoice[],
  appointments: Appointment[],
  payments: Payment[]
) {
  const today = new Date();

  const revenueEntries = getRevenueEntries(payments, invoices);
  const totalRevenue = sumRevenue(revenueEntries);

  return {
    totalRevenue,
    stripePaymentCount: revenueEntries.length,
    openRepairOrders: repairOrders.filter((r) =>
      OPEN_REPAIR_STATUSES.includes(r.status)
    ).length,
    outstandingInvoices: invoices.filter(
      (i) => i.status === "sent" || i.status === "overdue"
    ).length,
    appointmentsToday: getTodayAppointments(appointments, today).length,
  };
}
