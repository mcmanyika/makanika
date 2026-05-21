import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import {
  createAppointmentServer,
  updateAppointmentServer,
} from "@/lib/server/appointmentService";
import { AppointmentStatus } from "@/types";

const TTL_MS = 10 * 60 * 1000;

export type PendingActionType = "book_appointment" | "reschedule_appointment";

export interface BookAppointmentPayload {
  customerId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
}

export interface RescheduleAppointmentPayload {
  appointmentId: string;
  customerId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
  status: AppointmentStatus;
}

export interface PendingActionDoc {
  id: string;
  userId: string;
  shopId: string;
  action: PendingActionType;
  payload: BookAppointmentPayload | RescheduleAppointmentPayload;
  summary: string;
  expiresAt: Date;
}

export async function savePendingAction(
  userId: string,
  shopId: string,
  action: PendingActionType,
  payload: BookAppointmentPayload | RescheduleAppointmentPayload,
  summary: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const ref = await getAdminFirestore()
    .collection(COLLECTIONS.chatPendingActions)
    .add({
      userId,
      shopId,
      action,
      payload,
      summary,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
    });
  return ref.id;
}

export async function getPendingAction(
  id: string,
  userId: string
): Promise<PendingActionDoc | null> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.chatPendingActions)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.userId !== userId) return null;
  const expiresAt = data.expiresAt?.toDate?.() ?? new Date(0);
  if (expiresAt < new Date()) {
    await snap.ref.delete();
    return null;
  }
  return {
    id: snap.id,
    userId: String(data.userId),
    shopId: String(data.shopId),
    action: data.action as PendingActionType,
    payload: data.payload as BookAppointmentPayload | RescheduleAppointmentPayload,
    summary: String(data.summary),
    expiresAt,
  };
}

export async function deletePendingAction(id: string): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.chatPendingActions)
    .doc(id)
    .delete();
}

export async function executePendingAction(
  doc: PendingActionDoc
): Promise<string> {
  if (doc.action === "book_appointment") {
    const p = doc.payload as BookAppointmentPayload;
    const id = await createAppointmentServer({
      shopId: doc.shopId,
      customerId: p.customerId,
      title: p.title,
      scheduledAt: new Date(p.scheduledAt),
      durationMinutes: p.durationMinutes,
      vehicleId: p.vehicleId,
      description: p.description,
    });
    return `Appointment booked successfully (ID: ${id}).`;
  }

  const p = doc.payload as RescheduleAppointmentPayload;
  await updateAppointmentServer(p.appointmentId, doc.shopId, {
    customerId: p.customerId,
    title: p.title,
    scheduledAt: new Date(p.scheduledAt),
    durationMinutes: p.durationMinutes,
    vehicleId: p.vehicleId,
    description: p.description,
    status: p.status,
  });
  return "Appointment updated successfully.";
}

export function formatPendingSummary(
  action: PendingActionType,
  payload: BookAppointmentPayload | RescheduleAppointmentPayload
): string {
  const when = new Date(payload.scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (action === "book_appointment") {
    const p = payload as BookAppointmentPayload;
    return `Book "${p.title}" on ${when}${p.durationMinutes ? ` (${p.durationMinutes} min)` : ""}`;
  }
  const p = payload as RescheduleAppointmentPayload;
  return `Reschedule to ${when} — ${p.title} (${p.status})`;
}
