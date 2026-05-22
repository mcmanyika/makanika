import {
  assertNoAppointmentConflict,
} from "@/lib/appointmentConflicts";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { listAppointmentsForShop } from "@/lib/server/appointmentService";
import { getAdminFirestore } from "@/lib/server/firebase-admin";

const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 17;

export interface SlotValidationResult {
  ok: boolean;
  error?: string;
  scheduledAt?: Date;
}

function isWithinBusinessHours(start: Date, durationMinutes: number): boolean {
  const day = start.getDay();
  if (day < 1 || day > 5) return false;
  if (start.getHours() < BUSINESS_HOUR_START) return false;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  if (end.getHours() > BUSINESS_HOUR_END) return false;
  if (end.getHours() === BUSINESS_HOUR_END && end.getMinutes() > 0) return false;
  return true;
}

export async function validateBookableSlot(
  shopId: string,
  scheduledAtIso: string,
  durationMinutes = 60,
  options?: { excludeAppointmentId?: string }
): Promise<SlotValidationResult> {
  const when = new Date(scheduledAtIso);
  if (Number.isNaN(when.getTime())) {
    return {
      ok: false,
      error:
        "Invalid date/time. Use the exact ISO timestamp from suggest_available_slots (e.g. 2026-05-24T18:00:00.000Z).",
    };
  }

  if (when <= new Date()) {
    return { ok: false, error: "That time is in the past. Call suggest_available_slots for open times." };
  }

  if (!isWithinBusinessHours(when, durationMinutes)) {
    return {
      ok: false,
      error: "Shop hours are Monday–Friday, 8:00 AM – 5:00 PM. Pick a slot from suggest_available_slots.",
    };
  }

  const existing = await listAppointmentsForShop(shopId);
  try {
    assertNoAppointmentConflict(
      existing,
      {
        scheduledAt: when,
        durationMinutes,
        status: "scheduled",
        shopId,
      },
      options?.excludeAppointmentId
        ? { excludeId: options.excludeAppointmentId }
        : undefined
    );
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "That time conflicts with another appointment. Call suggest_available_slots.",
    };
  }

  return { ok: true, scheduledAt: when };
}

export async function validateCustomerForShop(
  shopId: string,
  customerId: string
): Promise<{ ok: boolean; error?: string }> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.customers)
    .doc(customerId)
    .get();
  if (!snap.exists || snap.data()?.shopId !== shopId) {
    return {
      ok: false,
      error:
        "customerId is invalid. Use find_customer_by_name (staff) or the Customer ID from context.",
    };
  }
  return { ok: true };
}

export async function validateVehicleForCustomer(
  shopId: string,
  customerId: string,
  vehicleId: string
): Promise<{ ok: boolean; error?: string }> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.vehicles)
    .doc(vehicleId)
    .get();
  if (!snap.exists) {
    return { ok: false, error: "vehicleId not found. Use a vehicle id from context only." };
  }
  const data = snap.data()!;
  if (data.shopId !== shopId || data.customerId !== customerId) {
    return {
      ok: false,
      error: "vehicleId does not belong to this customer. Use ids listed in context.",
    };
  }
  return { ok: true };
}
