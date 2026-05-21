import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  getEffectiveOrderStatus,
  getRepairOrderJobs,
} from "@/lib/repairOrderJobs";
import { REPAIR_STATUS_LABELS, toDate } from "@/lib/utils";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { isShopStaff } from "@/lib/server/auth";
import { listAppointmentsForCustomer } from "@/lib/server/appointmentService";
import { RepairOrder, Shop, User, Vehicle } from "@/types";

export async function loadShop(shopId: string): Promise<Shop | null> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.shops)
    .doc(shopId)
    .get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    id: snap.id,
    name: String(data.name),
    address: String(data.address),
    city: String(data.city),
    state: String(data.state),
    zip: String(data.zip),
    phone: String(data.phone),
    email: String(data.email),
    timezone: String(data.timezone ?? "America/New_York"),
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

async function loadVehiclesForCustomer(
  shopId: string,
  customerId: string
): Promise<Vehicle[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.vehicles)
    .where("shopId", "==", shopId)
    .where("customerId", "==", customerId)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      shopId: String(data.shopId),
      customerId: String(data.customerId),
      year: Number(data.year),
      make: String(data.make),
      model: String(data.model),
      trim: data.trim as string | undefined,
      vin: data.vin as string | undefined,
      licensePlate: data.licensePlate as string | undefined,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

async function loadRepairOrdersForCustomer(
  shopId: string,
  customerId: string
): Promise<RepairOrder[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.repairOrders)
    .where("shopId", "==", shopId)
    .where("customerId", "==", customerId)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      shopId: String(data.shopId),
      customerId: String(data.customerId),
      vehicleId: String(data.vehicleId),
      orderNumber: String(data.orderNumber),
      status: data.status as RepairOrder["status"],
      description: String(data.description ?? ""),
      jobs: data.jobs as RepairOrder["jobs"],
      assignedMechanicName: data.assignedMechanicName as string | undefined,
      mediaIds: (data.mediaIds as string[]) ?? [],
      receivedAt: data.receivedAt?.toDate?.() ?? new Date(),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function buildSystemContext(user: User): Promise<string> {
  const shop = await loadShop(user.shopId!);
  if (!shop) return "Shop context unavailable.";

  const lines: string[] = [
    `Shop: ${shop.name}`,
    `Phone: ${shop.phone}`,
    `Timezone: ${shop.timezone}`,
    `Business hours: Monday–Friday, 8:00 AM – 5:00 PM (shop local time).`,
    `User role: ${user.role}`,
    `User name: ${user.displayName}`,
  ];

  if (user.role === "customer" && user.customerId) {
    const [vehicles, appointments, orders] = await Promise.all([
      loadVehiclesForCustomer(user.shopId!, user.customerId),
      listAppointmentsForCustomer(user.shopId!, user.customerId),
      loadRepairOrdersForCustomer(user.shopId!, user.customerId),
    ]);

    const now = new Date();
    const upcoming = appointments
      .filter((a) => {
        const when = toDate(a.scheduledAt as Date);
        return when >= now && a.status !== "cancelled";
      })
      .slice(0, 10);

    lines.push(`Customer ID for bookings: ${user.customerId}`);
    if (vehicles.length) {
      lines.push(
        "Vehicles: " +
          vehicles
            .map((v) => `${v.id}: ${v.year} ${v.make} ${v.model}`)
            .join("; ")
      );
    }
    if (upcoming.length) {
      lines.push(
        "Upcoming appointments: " +
          upcoming
            .map((a) => {
              const when = toDate(a.scheduledAt as Date);
              return `${a.id} ${a.title} at ${when.toISOString()} (${a.status})`;
            })
            .join("; ")
      );
    }
    const activeOrders = orders.filter((o) => o.status !== "ready_for_pickup");
    if (activeOrders.length) {
      lines.push(
        "Active repair orders: " +
          activeOrders
            .map((o) => {
              const status = REPAIR_STATUS_LABELS[getEffectiveOrderStatus(o)];
              return `${o.orderNumber} (${o.id}): ${status}`;
            })
            .join("; ")
      );
    }
  } else if (isShopStaff(user.role)) {
    lines.push(
      "You can book appointments for customers. Use find_customer_by_name when the user names a customer, then book_appointment with that customerId."
    );
  }

  return lines.join("\n");
}

export async function getRepairOrderSummary(
  shopId: string,
  orderNumberOrId: string,
  customerId?: string
): Promise<string | null> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.repairOrders)
    .where("shopId", "==", shopId)
    .get();

  const normalized = orderNumberOrId.trim().toUpperCase();
  const match = snap.docs.find((d) => {
    const data = d.data();
    if (customerId && data.customerId !== customerId) return false;
    return (
      d.id === orderNumberOrId ||
      String(data.orderNumber).toUpperCase() === normalized
    );
  });

  if (!match) return null;

  const data = match.data();
  const order: RepairOrder = {
    id: match.id,
    shopId: String(data.shopId),
    customerId: String(data.customerId),
    vehicleId: String(data.vehicleId),
    orderNumber: String(data.orderNumber),
    status: data.status as RepairOrder["status"],
    description: String(data.description ?? ""),
    jobs: data.jobs as RepairOrder["jobs"],
    assignedMechanicName: data.assignedMechanicName as string | undefined,
    mediaIds: [],
    receivedAt: data.receivedAt?.toDate?.() ?? new Date(),
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };

  const status = REPAIR_STATUS_LABELS[getEffectiveOrderStatus(order)];
  const jobs = getRepairOrderJobs(order)
    .map((j) => `${j.description} (${j.status})`)
    .join("; ");

  return `Repair order ${order.orderNumber}: status ${status}. Jobs: ${jobs || order.description}. Technician: ${order.assignedMechanicName ?? "TBD"}.`;
}
