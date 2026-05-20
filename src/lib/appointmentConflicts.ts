import { formatDateTime, toDate } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/types";

/** Statuses that occupy shop calendar time (overlap checks apply). */
export const BLOCKING_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
];

export interface AppointmentSlot {
  id?: string;
  shopId?: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  title?: string;
  customerId?: string;
}

export function getAppointmentEnd(
  scheduledAt: Date,
  durationMinutes: number
): Date {
  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
}

export function appointmentSlotsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isBlockingAppointmentStatus(status: AppointmentStatus): boolean {
  return BLOCKING_APPOINTMENT_STATUSES.includes(status);
}

/** Returns existing appointments that overlap the candidate time slot. */
export function findAppointmentConflicts(
  existing: Appointment[],
  candidate: AppointmentSlot,
  options?: { excludeId?: string; shopId?: string }
): Appointment[] {
  if (!isBlockingAppointmentStatus(candidate.status)) {
    return [];
  }

  const cStart = candidate.scheduledAt;
  const cEnd = getAppointmentEnd(cStart, candidate.durationMinutes);

  return existing.filter((apt) => {
    if (options?.excludeId && apt.id === options.excludeId) return false;
    if (options?.shopId && apt.shopId !== options.shopId) return false;
    if (!isBlockingAppointmentStatus(apt.status)) return false;

    const aStart = toDate(apt.scheduledAt);
    const aEnd = getAppointmentEnd(aStart, apt.durationMinutes);
    return appointmentSlotsOverlap(cStart, cEnd, aStart, aEnd);
  });
}

export function formatAppointmentConflictError(
  conflicts: Appointment[],
  getCustomerName?: (customerId: string) => string
): string {
  if (conflicts.length === 0) return "";

  const lines = conflicts.slice(0, 3).map((apt) => {
    const who = getCustomerName?.(apt.customerId) ?? "another customer";
    return `${apt.title} (${who}, ${formatDateTime(toDate(apt.scheduledAt))})`;
  });
  const extra =
    conflicts.length > 3 ? ` and ${conflicts.length - 3} more` : "";

  return `This time slot is already booked: ${lines.join("; ")}${extra}. Please choose a different time.`;
}

export function assertNoAppointmentConflict(
  existing: Appointment[],
  candidate: AppointmentSlot,
  options?: {
    excludeId?: string;
    shopId?: string;
    getCustomerName?: (customerId: string) => string;
  }
): void {
  const conflicts = findAppointmentConflicts(existing, candidate, {
    excludeId: options?.excludeId,
    shopId: options?.shopId,
  });
  if (conflicts.length > 0) {
    throw new Error(
      formatAppointmentConflictError(conflicts, options?.getCustomerName)
    );
  }
}
