import {
  AppointmentDateFilter,
  AppointmentSort,
} from "@/components/appointments/AppointmentFiltersBar";
import { APPOINTMENT_STATUS_LABELS, toDate } from "@/lib/utils";
import { Appointment, Customer, Vehicle } from "@/types";

export function filterAppointments(
  appointments: Appointment[],
  options: {
    search: string;
    statusFilter: Appointment["status"] | "all";
    dateFilter: AppointmentDateFilter;
    customerFilter: string;
    sort: AppointmentSort;
    getCustomer: (id: string) => Customer | undefined;
    vehicles: Vehicle[];
  }
): Appointment[] {
  const {
    search,
    statusFilter,
    dateFilter,
    customerFilter,
    sort,
    getCustomer,
    vehicles,
  } = options;

  const q = search.trim().toLowerCase();
  const now = new Date();

  let list = appointments.filter((apt) => {
    if (statusFilter !== "all" && apt.status !== statusFilter) return false;
    if (customerFilter !== "all" && apt.customerId !== customerFilter) return false;

    const when = toDate(apt.scheduledAt);
    if (dateFilter === "upcoming" && when < now) return false;
    if (dateFilter === "past" && when >= now) return false;
    if (dateFilter === "30d") {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      if (when < cutoff || when > now) return false;
    }
    if (dateFilter === "next30d") {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      if (when < now || when > end) return false;
    }

    if (!q) return true;

    const customer = getCustomer(apt.customerId);
    const vehicle = vehicles.find((v) => v.id === apt.vehicleId);
    const haystack = [
      apt.title,
      apt.description,
      customer?.firstName,
      customer?.lastName,
      customer?.email,
      vehicle?.make,
      vehicle?.model,
      String(vehicle?.year),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  list = [...list].sort((a, b) => {
    if (sort === "customer") {
      const ca = getCustomer(a.customerId);
      const cb = getCustomer(b.customerId);
      const na = `${ca?.lastName ?? ""} ${ca?.firstName ?? ""}`.trim();
      const nb = `${cb?.lastName ?? ""} ${cb?.firstName ?? ""}`.trim();
      return na.localeCompare(nb);
    }
    if (sort === "status") {
      return APPOINTMENT_STATUS_LABELS[a.status].localeCompare(
        APPOINTMENT_STATUS_LABELS[b.status]
      );
    }
    const ta = toDate(a.scheduledAt).getTime();
    const tb = toDate(b.scheduledAt).getTime();
    if (sort === "date_desc") return tb - ta;
    return ta - tb;
  });

  return list;
}
