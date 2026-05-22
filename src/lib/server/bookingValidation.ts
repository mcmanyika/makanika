import { assertNoAppointmentConflict } from "@/lib/appointmentConflicts";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { listAppointmentsForShop } from "@/lib/server/appointmentService";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import {
  isShopOpenDay,
  isWithinBusinessHours,
  SHOP_CLOSED_DAY_LABEL,
  SHOP_HOURS_LABEL,
} from "@/lib/shopSchedule";

export interface SlotValidationResult {
  ok: boolean;
  error?: string;
  scheduledAt?: Date;
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
    return {
      ok: false,
      error: "That time is in the past. Call suggest_available_slots for open times.",
    };
  }

  if (!isShopOpenDay(when.getDay())) {
    return {
      ok: false,
      error: `We are closed on ${SHOP_CLOSED_DAY_LABEL}. Shop hours: ${SHOP_HOURS_LABEL}.`,
    };
  }

  if (!isWithinBusinessHours(when, durationMinutes)) {
    return {
      ok: false,
      error: `Outside shop hours (${SHOP_HOURS_LABEL}). Pick a slot from suggest_available_slots.`,
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
