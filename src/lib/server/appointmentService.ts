import { Timestamp } from "firebase-admin/firestore";
import {
  assertNoAppointmentConflict,
  findAppointmentConflicts,
} from "@/lib/appointmentConflicts";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  BUSINESS_HOUR_END,
  BUSINESS_HOUR_START,
  isShopOpenDay,
} from "@/lib/shopSchedule";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import {
  Appointment,
  AppointmentStatus,
  Customer,
} from "@/types";

const SLOT_STEP_MINUTES = 30;
const DEFAULT_DURATION = 60;

function mapAppointment(
  id: string,
  data: FirebaseFirestore.DocumentData
): Appointment {
  const scheduledAt = data.scheduledAt?.toDate?.() ?? new Date();
  return {
    id,
    shopId: String(data.shopId),
    customerId: String(data.customerId),
    vehicleId: data.vehicleId as string | undefined,
    repairOrderId: data.repairOrderId as string | undefined,
    title: String(data.title),
    description: data.description as string | undefined,
    scheduledAt,
    durationMinutes: Number(data.durationMinutes ?? 60),
    status: data.status as AppointmentStatus,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function listAppointmentsForShop(
  shopId: string
): Promise<Appointment[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.appointments)
    .where("shopId", "==", shopId)
    .get();
  return snap.docs.map((d) => mapAppointment(d.id, d.data()));
}

export async function listAppointmentsForCustomer(
  shopId: string,
  customerId: string
): Promise<Appointment[]> {
  const all = await listAppointmentsForShop(shopId);
  return all.filter((a) => a.customerId === customerId);
}

export interface SuggestSlotsOptions {
  from: Date;
  to: Date;
  durationMinutes?: number;
  maxResults?: number;
}

export async function suggestAvailableSlots(
  shopId: string,
  options: SuggestSlotsOptions
): Promise<{ scheduledAt: string; label: string }[]> {
  const durationMinutes = options.durationMinutes ?? DEFAULT_DURATION;
  const maxResults = options.maxResults ?? 8;
  const existing = await listAppointmentsForShop(shopId);
  const results: { scheduledAt: string; label: string }[] = [];

  const cursor = new Date(options.from);
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES, 0, 0);

  while (cursor < options.to && results.length < maxResults) {
    const day = cursor.getDay();
    if (isShopOpenDay(day)) {
      const hour = cursor.getHours();
      if (hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END) {
        const endHour =
          hour + Math.ceil(durationMinutes / 60) + ((durationMinutes % 60) > 0 ? 1 : 0);
        if (endHour <= BUSINESS_HOUR_END || hour + durationMinutes / 60 <= BUSINESS_HOUR_END) {
          const conflicts = findAppointmentConflicts(existing, {
            scheduledAt: new Date(cursor),
            durationMinutes,
            status: "scheduled",
            shopId,
          });
          if (conflicts.length === 0 && cursor > new Date()) {
            results.push({
              scheduledAt: cursor.toISOString(),
              label: cursor.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
            });
          }
        }
      }
    }
    cursor.setMinutes(cursor.getMinutes() + SLOT_STEP_MINUTES);
  }

  return results;
}

export interface CreateAppointmentServerInput {
  shopId: string;
  customerId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
  status?: AppointmentStatus;
}

export async function createAppointmentServer(
  input: CreateAppointmentServerInput
): Promise<string> {
  const durationMinutes = input.durationMinutes ?? DEFAULT_DURATION;
  const status = input.status ?? "scheduled";

  if (input.scheduledAt < new Date()) {
    throw new Error("Please pick a future date and time.");
  }

  const existing = await listAppointmentsForShop(input.shopId);
  assertNoAppointmentConflict(existing, {
    scheduledAt: input.scheduledAt,
    durationMinutes,
    status,
    shopId: input.shopId,
  });

  const ref = await getAdminFirestore()
    .collection(COLLECTIONS.appointments)
    .add({
      shopId: input.shopId,
      customerId: input.customerId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      vehicleId: input.vehicleId ?? null,
      scheduledAt: Timestamp.fromDate(input.scheduledAt),
      durationMinutes,
      status,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

  return ref.id;
}

export interface UpdateAppointmentServerInput {
  customerId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
  status: AppointmentStatus;
}

export async function updateAppointmentServer(
  appointmentId: string,
  shopId: string,
  input: UpdateAppointmentServerInput
): Promise<void> {
  const durationMinutes = input.durationMinutes ?? DEFAULT_DURATION;
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.appointments)
    .doc(appointmentId);
  const existingSnap = await ref.get();
  if (!existingSnap.exists) {
    throw new Error("Appointment not found.");
  }
  if (existingSnap.data()?.shopId !== shopId) {
    throw new Error("Appointment not found.");
  }

  const existing = await listAppointmentsForShop(shopId);
  assertNoAppointmentConflict(
    existing,
    {
      id: appointmentId,
      scheduledAt: input.scheduledAt,
      durationMinutes,
      status: input.status,
      shopId,
    },
    { excludeId: appointmentId }
  );

  await ref.update({
    customerId: input.customerId,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    vehicleId: input.vehicleId ?? null,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    durationMinutes,
    status: input.status,
    updatedAt: Timestamp.now(),
  });
}

export async function getAppointmentById(
  appointmentId: string,
  shopId: string
): Promise<Appointment | null> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.appointments)
    .doc(appointmentId)
    .get();
  if (!snap.exists || snap.data()?.shopId !== shopId) return null;
  return mapAppointment(snap.id, snap.data()!);
}

export async function findCustomerByName(
  shopId: string,
  query: string
): Promise<Customer[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.customers)
    .where("shopId", "==", shopId)
    .get();
  const q = query.trim().toLowerCase();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        shopId: String(data.shopId),
        userId: data.userId as string | undefined,
        firstName: String(data.firstName),
        lastName: String(data.lastName),
        email: String(data.email),
        phone: String(data.phone),
        vehicleIds: (data.vehicleIds as string[]) ?? [],
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      } satisfies Customer;
    })
    .filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(q) || c.email.toLowerCase().includes(q);
    })
    .slice(0, 5);
}
