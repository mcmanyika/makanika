import { clsx, type ClassValue } from "clsx";
import { Timestamp } from "firebase/firestore";
import {
  RepairOrderStatus,
  EstimateApprovalStatus,
  InvoiceStatus,
  AppointmentStatus,
  UserRole,
} from "@/types";

export function toDate(value: Date | Timestamp | string | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return new Date(value);
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const REPAIR_ORDER_STATUSES: RepairOrderStatus[] = [
  "received",
  "diagnosing",
  "waiting_approval",
  "in_progress",
  "completed",
  "ready_for_pickup",
];

export const REPAIR_STATUS_LABELS: Record<RepairOrderStatus, string> = {
  received: "Received",
  diagnosing: "Diagnosing",
  waiting_approval: "Waiting Approval",
  in_progress: "In Progress",
  completed: "Completed",
  ready_for_pickup: "Ready for Pickup",
};

export const ESTIMATE_STATUS_LABELS: Record<EstimateApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes Requested",
  declined: "Declined",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  shop_admin: "Shop admin",
  mechanic: "Mechanic",
  customer: "Customer",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export function getRepairStatusIndex(status: RepairOrderStatus): number {
  return REPAIR_ORDER_STATUSES.indexOf(status);
}
