import {
  CustomerActivityFilter,
  CustomerDateFilter,
  CustomerSort,
  CustomerVehicleFilter,
} from "@/components/customers/CustomerFiltersBar";
import { toDate } from "@/lib/utils";
import {
  Appointment,
  Customer,
  Invoice,
  RepairOrder,
  Vehicle,
} from "@/types";

const OPEN_REPAIR_STATUSES: RepairOrder["status"][] = [
  "received",
  "diagnosing",
  "waiting_approval",
  "in_progress",
  "completed",
];

const OUTSTANDING_INVOICE_STATUSES: Invoice["status"][] = ["sent", "overdue"];

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function matchesDateRange(date: Date, range: CustomerDateFilter): boolean {
  if (range === "all") return true;
  const now = new Date();
  if (range === "30d") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return date >= cutoff;
  }
  if (range === "90d") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    return date >= cutoff;
  }
  return date >= startOfYear(now);
}

export function filterCustomers(
  customers: Customer[],
  options: {
    search: string;
    stateFilter: string;
    vehicleFilter: CustomerVehicleFilter;
    dateFilter: CustomerDateFilter;
    activityFilter: CustomerActivityFilter;
    sort: CustomerSort;
    vehicles: Vehicle[];
    repairOrders: RepairOrder[];
    invoices: Invoice[];
    appointments: Appointment[];
  }
): Customer[] {
  const {
    search,
    stateFilter,
    vehicleFilter,
    dateFilter,
    activityFilter,
    sort,
    vehicles,
    repairOrders,
    invoices,
    appointments,
  } = options;

  const q = search.trim().toLowerCase();
  const now = new Date();

  const vehicleCountByCustomer = new Map<string, number>();
  for (const v of vehicles) {
    vehicleCountByCustomer.set(
      v.customerId,
      (vehicleCountByCustomer.get(v.customerId) ?? 0) + 1
    );
  }

  let list = customers.filter((c) => {
    if (stateFilter !== "all") {
      const customerState = (c.state ?? "").toUpperCase();
      if (customerState !== stateFilter.toUpperCase()) return false;
    }

    const vehicleCount = vehicleCountByCustomer.get(c.id) ?? 0;
    if (vehicleFilter === "with" && vehicleCount === 0) return false;
    if (vehicleFilter === "without" && vehicleCount > 0) return false;

    if (!matchesDateRange(toDate(c.createdAt), dateFilter)) return false;

    if (activityFilter === "open_ro") {
      const hasOpen = repairOrders.some(
        (ro) => ro.customerId === c.id && OPEN_REPAIR_STATUSES.includes(ro.status)
      );
      if (!hasOpen) return false;
    }
    if (activityFilter === "outstanding_invoice") {
      const hasOutstanding = invoices.some(
        (inv) =>
          inv.customerId === c.id &&
          OUTSTANDING_INVOICE_STATUSES.includes(inv.status)
      );
      if (!hasOutstanding) return false;
    }
    if (activityFilter === "upcoming_appointment") {
      const hasUpcoming = appointments.some(
        (apt) =>
          apt.customerId === c.id && toDate(apt.scheduledAt) >= now
      );
      if (!hasUpcoming) return false;
    }

    if (!q) return true;

    const haystack = [
      c.firstName,
      c.lastName,
      `${c.firstName} ${c.lastName}`,
      c.email,
      c.phone,
      c.address,
      c.city,
      c.state,
      c.zip,
      c.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  list = [...list].sort((a, b) => {
    if (sort === "vehicles_desc") {
      return (
        (vehicleCountByCustomer.get(b.id) ?? 0) -
        (vehicleCountByCustomer.get(a.id) ?? 0)
      );
    }
    if (sort === "newest") {
      return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime();
    }
    if (sort === "oldest") {
      return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime();
    }
    const na = `${a.lastName} ${a.firstName}`.trim();
    const nb = `${b.lastName} ${b.firstName}`.trim();
    if (sort === "name_desc") return nb.localeCompare(na);
    return na.localeCompare(nb);
  });

  return list;
}

export function getUniqueCustomerStates(customers: Customer[]): string[] {
  const states = new Set<string>();
  for (const c of customers) {
    if (c.state?.trim()) states.add(c.state.trim().toUpperCase());
  }
  return [...states].sort();
}
