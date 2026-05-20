import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { assertNoAppointmentConflict } from "@/lib/appointmentConflicts";
import { sanitizeLineItemsForSave } from "@/lib/invoiceLineItems";
import { getFirebaseDb } from "./config";
import { COLLECTIONS } from "./collections";
import {
  EstimateApprovalStatus,
  Appointment,
  AppointmentStatus,
  RepairOrderStatus,
  RepairOrderJob,
  UserRole,
  EstimateLineItem,
} from "@/types";
import {
  deriveOrderStatus,
  formatJobsSummary,
  getRepairOrderJobs,
  sanitizeJobsForSave,
} from "@/lib/repairOrderJobs";

function generateNumber(prefix: string) {
  const year = new Date().getFullYear();
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${n}`;
}

// ——— Users ———

export async function updateUserRole(
  targetUserId: string,
  role: UserRole,
  actorUserId: string
) {
  if (targetUserId === actorUserId) {
    throw new Error("You cannot change your own role.");
  }

  const ref = doc(getFirebaseDb(), COLLECTIONS.users, targetUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("User not found.");
  }

  const data = snap.data();
  if (role === "customer" && !data.customerId) {
    throw new Error(
      "This user has no customer profile. Assign the customer role from the customer record, or use shop staff roles."
    );
  }

  await updateDoc(ref, {
    role,
    updatedAt: serverTimestamp(),
  });
}

// ——— Shop ———

export interface UpdateShopInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  timezone: string;
}

export async function updateShop(shopId: string, input: UpdateShopInput) {
  const name = input.name.trim();
  const email = input.email.trim();

  if (!name) throw new Error("Shop name is required.");
  if (!email) throw new Error("Email is required.");

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.shops, shopId), {
    name,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    zip: input.zip.trim(),
    phone: input.phone.trim(),
    email,
    timezone: input.timezone.trim() || "America/Chicago",
    updatedAt: serverTimestamp(),
  });
}

// ——— Appointments ———

async function fetchShopAppointments(shopId: string): Promise<Appointment[]> {
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.appointments),
      where("shopId", "==", shopId)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      shopId: data.shopId as string,
      customerId: data.customerId as string,
      vehicleId: data.vehicleId as string | undefined,
      repairOrderId: data.repairOrderId as string | undefined,
      title: data.title as string,
      description: data.description as string | undefined,
      scheduledAt: (data.scheduledAt as Timestamp).toDate(),
      durationMinutes: (data.durationMinutes as number) ?? 60,
      status: data.status as AppointmentStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

export interface CreateAppointmentInput {
  shopId: string;
  customerId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
  status?: AppointmentStatus;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const durationMinutes = input.durationMinutes ?? 60;
  const status = input.status ?? "scheduled";

  const existing = await fetchShopAppointments(input.shopId);
  assertNoAppointmentConflict(existing, {
    scheduledAt: input.scheduledAt,
    durationMinutes,
    status,
    shopId: input.shopId,
  });

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.appointments), {
    shopId: input.shopId,
    customerId: input.customerId,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    vehicleId: input.vehicleId ?? null,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    durationMinutes,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export interface UpdateAppointmentInput {
  customerId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes?: number;
  vehicleId?: string;
  description?: string;
  status: AppointmentStatus;
}

export async function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput
) {
  const durationMinutes = input.durationMinutes ?? 60;
  const existingRef = doc(
    getFirebaseDb(),
    COLLECTIONS.appointments,
    appointmentId
  );
  const existingSnap = await getDoc(existingRef);
  if (!existingSnap.exists()) {
    throw new Error("Appointment not found.");
  }
  const shopId = existingSnap.data().shopId as string;

  const existing = await fetchShopAppointments(shopId);
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

  await updateDoc(existingRef, {
    customerId: input.customerId,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    vehicleId: input.vehicleId ?? null,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    durationMinutes,
    status: input.status,
    updatedAt: serverTimestamp(),
  });
}

// ——— Vehicles ———

export interface CreateVehicleInput {
  shopId: string;
  customerId: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  mileage?: number;
  notes?: string;
}

export async function createVehicle(input: CreateVehicleInput) {
  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.vehicles), {
    shopId: input.shopId,
    customerId: input.customerId,
    year: input.year,
    make: input.make.trim(),
    model: input.model.trim(),
    trim: input.trim?.trim() ?? null,
    vin: input.vin?.trim() ?? null,
    licensePlate: input.licensePlate?.trim() ?? null,
    color: input.color?.trim() ?? null,
    mileage: input.mileage ?? null,
    notes: input.notes?.trim() ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.customers, input.customerId), {
    vehicleIds: arrayUnion(ref.id),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export type UpdateVehicleInput = Omit<CreateVehicleInput, "shopId" | "customerId">;

export async function updateVehicle(vehicleId: string, input: UpdateVehicleInput) {
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.vehicles, vehicleId), {
    year: input.year,
    make: input.make.trim(),
    model: input.model.trim(),
    trim: input.trim?.trim() ?? null,
    vin: input.vin?.trim() ?? null,
    licensePlate: input.licensePlate?.trim() ?? null,
    color: input.color?.trim() ?? null,
    mileage: input.mileage ?? null,
    notes: input.notes?.trim() ?? null,
    updatedAt: serverTimestamp(),
  });
}

// ——— Customers ———

export interface CreateCustomerInput {
  shopId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export async function createCustomer(input: CreateCustomerInput) {
  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.customers), {
    shopId: input.shopId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address?.trim() ?? null,
    city: input.city?.trim() ?? null,
    state: input.state?.trim() ?? null,
    zip: input.zip?.trim() ?? null,
    notes: input.notes?.trim() ?? null,
    vehicleIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ——— Repair orders ———

export interface RepairOrderJobInput {
  id?: string;
  description: string;
  status?: RepairOrderStatus;
  assignedMechanicName?: string;
  notes?: string;
}

export interface CreateRepairOrderInput {
  shopId: string;
  customerId: string;
  vehicleId: string;
  /** @deprecated Prefer `jobs` — kept for single-line creates */
  description?: string;
  jobs?: RepairOrderJobInput[];
  customerConcerns?: string;
  assignedMechanicName?: string;
  status?: RepairOrderStatus;
}

export async function createRepairOrder(input: CreateRepairOrderInput) {
  const orderStatus = input.status ?? "received";
  const mechanic = input.assignedMechanicName?.trim();

  let jobs: RepairOrderJob[];
  if (input.jobs && input.jobs.length > 0) {
    jobs = sanitizeJobsForSave(
      input.jobs.map((j) => ({
        id: j.id ?? "",
        description: j.description,
        status: j.status ?? orderStatus,
        assignedMechanicName: j.assignedMechanicName,
        notes: j.notes,
      })),
      orderStatus,
      mechanic
    );
  } else if (input.description?.trim()) {
    jobs = sanitizeJobsForSave(
      [
        {
          id: "",
          description: input.description,
          status: orderStatus,
          assignedMechanicName: mechanic,
        },
      ],
      orderStatus,
      mechanic
    );
  } else {
    throw new Error("At least one job description is required.");
  }

  if (jobs.length === 0) {
    throw new Error("At least one job description is required.");
  }

  const description = formatJobsSummary(jobs);
  const status = deriveOrderStatus(jobs);

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.repairOrders), {
    shopId: input.shopId,
    customerId: input.customerId,
    vehicleId: input.vehicleId,
    orderNumber: generateNumber("RO"),
    status,
    description,
    jobs,
    customerConcerns: input.customerConcerns?.trim() ?? null,
    assignedMechanicName: mechanic ?? null,
    mediaIds: [],
    receivedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export interface UpdateRepairOrderInput {
  customerConcerns?: string;
  assignedMechanicName?: string;
  status?: RepairOrderStatus;
  jobs?: RepairOrderJobInput[];
  internalNotes?: string;
}

export async function updateRepairOrder(
  repairOrderId: string,
  input: UpdateRepairOrderInput
) {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.customerConcerns !== undefined) {
    patch.customerConcerns = input.customerConcerns.trim() || null;
  }
  if (input.assignedMechanicName !== undefined) {
    patch.assignedMechanicName = input.assignedMechanicName.trim() || null;
  }
  if (input.internalNotes !== undefined) {
    patch.internalNotes = input.internalNotes.trim() || null;
  }

  if (input.jobs) {
    const fallbackStatus = input.status ?? "received";
    const mechanic = input.assignedMechanicName?.trim();

    const jobs = sanitizeJobsForSave(
      input.jobs.map((j) => ({
        id: j.id ?? "",
        description: j.description,
        status: j.status ?? fallbackStatus,
        assignedMechanicName: j.assignedMechanicName,
        notes: j.notes,
      })),
      fallbackStatus,
      mechanic
    );
    if (jobs.length === 0) {
      throw new Error("At least one job is required.");
    }
    patch.jobs = jobs;
    patch.description = formatJobsSummary(jobs);
    patch.status = deriveOrderStatus(jobs);
  } else if (input.status !== undefined) {
    const existingSnap = await getDoc(
      doc(getFirebaseDb(), COLLECTIONS.repairOrders, repairOrderId)
    );
    const existingData = existingSnap.data();
    const hasJobs =
      existingSnap.exists() &&
      Array.isArray(existingData?.jobs) &&
      (existingData?.jobs as RepairOrderJob[]).length > 0;

    if (hasJobs) {
      const order = {
        id: repairOrderId,
        description: String(existingData?.description ?? ""),
        status: (existingData?.status as RepairOrderStatus) ?? "received",
        jobs: existingData?.jobs as RepairOrderJob[],
        shopId: "",
        customerId: "",
        vehicleId: "",
        orderNumber: "",
        mediaIds: [],
        receivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const jobs = getRepairOrderJobs(order);
      patch.status = deriveOrderStatus(jobs);
    } else {
      patch.status = input.status;
    }
  }

  await updateDoc(
    doc(getFirebaseDb(), COLLECTIONS.repairOrders, repairOrderId),
    patch
  );
}

// ——— Invoices ———

export interface CreateInvoiceInput {
  shopId: string;
  customerId: string;
  repairOrderId: string;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date;
  lineItems?: EstimateLineItem[];
  status?: "draft" | "sent";
}

export async function createInvoice(input: CreateInvoiceInput) {
  const lineItems = input.lineItems ?? [];
  if (lineItems.length === 0) {
    throw new Error("Add at least one itemized line with a description and amount.");
  }

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.invoices), {
    shopId: input.shopId,
    customerId: input.customerId,
    repairOrderId: input.repairOrderId,
    invoiceNumber: generateNumber("INV"),
    lineItems,
    subtotal: input.subtotal,
    tax: input.tax,
    total: input.total,
    amountPaid: 0,
    status: input.status ?? "sent",
    dueDate: Timestamp.fromDate(input.dueDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(
    doc(getFirebaseDb(), COLLECTIONS.repairOrders, input.repairOrderId),
    {
      invoiceId: ref.id,
      updatedAt: serverTimestamp(),
    }
  );

  return ref.id;
}

// ——— Messages ———

export interface SendMessageInput {
  shopId: string;
  customerId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  body: string;
  repairOrderId?: string;
}

export async function sendMessage(input: SendMessageInput) {
  const body = input.body.trim();
  if (!body) throw new Error("Message cannot be empty.");

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.messages), {
    shopId: input.shopId,
    customerId: input.customerId,
    repairOrderId: input.repairOrderId ?? null,
    senderId: input.senderId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    body,
    read: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ——— Estimates ———

export interface CreateEstimateInput {
  shopId: string;
  customerId: string;
  repairOrderId: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil?: Date;
}

export async function createEstimate(input: CreateEstimateInput) {
  const lineItems = sanitizeLineItemsForSave(input.lineItems);
  if (lineItems.length === 0) {
    throw new Error("Add at least one line item with description and amount.");
  }

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.estimates), {
    shopId: input.shopId,
    customerId: input.customerId,
    repairOrderId: input.repairOrderId,
    lineItems,
    subtotal: input.subtotal,
    tax: input.tax,
    total: input.total,
    approvalStatus: "pending",
    validUntil: input.validUntil
      ? Timestamp.fromDate(input.validUntil)
      : null,
    sentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(
    doc(getFirebaseDb(), COLLECTIONS.repairOrders, input.repairOrderId),
    {
      estimateId: ref.id,
      updatedAt: serverTimestamp(),
    }
  );

  return ref.id;
}

export async function updateEstimateApproval(
  estimateId: string,
  approvalStatus: EstimateApprovalStatus,
  customerNotes?: string
) {
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.estimates, estimateId), {
    approvalStatus,
    customerNotes: customerNotes ?? null,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
