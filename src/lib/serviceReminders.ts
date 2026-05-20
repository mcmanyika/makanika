import { getRepairOrderJobs } from "@/lib/repairOrderJobs";
import { toDate } from "@/lib/utils";
import {
  Appointment,
  Invoice,
  RepairOrder,
  Vehicle,
} from "@/types";

export type ServiceReminderUrgency = "high" | "medium" | "low";

export type ServiceReminderKind =
  | "appointment"
  | "maintenance_overdue"
  | "maintenance_due"
  | "maintenance_soon";

export interface ServiceReminder {
  id: string;
  kind: ServiceReminderKind;
  serviceName: string;
  vehicleId: string;
  vehicleLabel: string;
  dueAt?: Date;
  dueMileage?: number;
  currentMileage?: number;
  message: string;
  urgency: ServiceReminderUrgency;
  appointmentId?: string;
  repairOrderId?: string;
  jobId?: string;
  ctaHref: string;
  ctaLabel: string;
}

interface ServiceDefinition {
  key: string;
  label: string;
  patterns: RegExp[];
  intervalMonths: number;
  intervalMiles: number;
}

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    key: "oil_change",
    label: "Oil change",
    patterns: [/oil\s*change/i, /engine\s*oil/i, /\boil\b.*\bservice/i],
    intervalMonths: 6,
    intervalMiles: 5000,
  },
  {
    key: "tire_rotation",
    label: "Tire rotation",
    patterns: [/tire\s*rotation/i, /rotate\s*tires/i],
    intervalMonths: 6,
    intervalMiles: 7500,
  },
  {
    key: "brake",
    label: "Brake service",
    patterns: [/brake/i],
    intervalMonths: 12,
    intervalMiles: 12000,
  },
  {
    key: "air_filter",
    label: "Air filter",
    patterns: [/air\s*filter/i, /cabin\s*filter/i],
    intervalMonths: 12,
    intervalMiles: 15000,
  },
  {
    key: "scheduled_maintenance",
    label: "Scheduled maintenance",
    patterns: [
      /\b\d{2,3}k\b/i,
      /\d{1,3},?\d{3}\s*mile/i,
      /scheduled\s*maintenance/i,
      /tune[- ]?up/i,
    ],
    intervalMonths: 12,
    intervalMiles: 10000,
  },
];

const COMPLETED_RO_STATUSES: RepairOrder["status"][] = [
  "completed",
  "ready_for_pickup",
];

const UPCOMING_APPOINTMENT_STATUSES: Appointment["status"][] = [
  "scheduled",
  "confirmed",
];

function vehicleLabel(v: Vehicle): string {
  return `${v.year} ${v.make} ${v.model}`;
}

function matchServiceType(text: string): ServiceDefinition | null {
  const normalized = text.toLowerCase();
  for (const def of SERVICE_DEFINITIONS) {
    if (def.patterns.some((p) => p.test(normalized))) return def;
  }
  return null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function urgencyFromDueDate(dueAt: Date, now: Date): ServiceReminderUrgency {
  const days = daysBetween(now, dueAt);
  if (days < 0) return "high";
  if (days <= 7) return "high";
  if (days <= 30) return "medium";
  return "low";
}

function urgencyFromMiles(milesUntil: number): ServiceReminderUrgency {
  if (milesUntil <= 0) return "high";
  if (milesUntil <= 500) return "high";
  if (milesUntil <= 1500) return "medium";
  return "low";
}

function maxUrgency(
  a: ServiceReminderUrgency,
  b: ServiceReminderUrgency
): ServiceReminderUrgency {
  const rank = { high: 3, medium: 2, low: 1 };
  return rank[a] >= rank[b] ? a : b;
}

function collectServiceText(
  ro: RepairOrder,
  invoices: Invoice[]
): string[] {
  const texts = [ro.description, ro.customerConcerns ?? ""];
  for (const job of getRepairOrderJobs(ro)) {
    texts.push(job.description, job.notes ?? "");
  }
  const inv = invoices.find((i) => i.repairOrderId === ro.id);
  if (inv?.lineItems) {
    for (const li of inv.lineItems) texts.push(li.description);
  }
  return texts.filter(Boolean);
}

function findLastServiceDate(
  vehicleId: string,
  def: ServiceDefinition,
  repairOrders: RepairOrder[],
  invoices: Invoice[],
  appointments: Appointment[]
): Date | null {
  let latest: Date | null = null;

  for (const ro of repairOrders) {
    if (ro.vehicleId !== vehicleId) continue;
    if (!COMPLETED_RO_STATUSES.includes(ro.status)) continue;

    const combined = collectServiceText(ro, invoices).join(" ");
    const matched = matchServiceType(combined);
    if (!matched || matched.key !== def.key) continue;

    const performed = ro.completedAt
      ? toDate(ro.completedAt)
      : toDate(ro.updatedAt);
    if (!latest || performed > latest) latest = performed;
  }

  for (const apt of appointments) {
    if (apt.vehicleId !== vehicleId) continue;
    if (apt.status !== "completed") continue;
    if (!def.patterns.some((p) => p.test(apt.title))) continue;
    const performed = toDate(apt.scheduledAt);
    if (!latest || performed > latest) latest = performed;
  }

  return latest;
}

function buildMaintenanceReminder(
  vehicle: Vehicle,
  def: ServiceDefinition,
  lastService: Date | null,
  now: Date
): ServiceReminder | null {
  const label = vehicleLabel(vehicle);
  const mileage = vehicle.mileage;

  let dueAt: Date;
  if (lastService) {
    dueAt = addMonths(lastService, def.intervalMonths);
  } else if (mileage != null && mileage > def.intervalMiles) {
    dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() - 14);
  } else {
    dueAt = addMonths(now, 1);
  }

  let dueMileage: number | undefined;
  if (mileage != null) {
    const baseline = lastService
      ? mileage
      : Math.max(0, mileage - Math.floor(def.intervalMiles * 0.9));
    dueMileage = baseline + def.intervalMiles;
  }

  const daysUntil = daysBetween(now, dueAt);
  const milesUntil =
    dueMileage != null && mileage != null ? dueMileage - mileage : null;

  const dateUrgent =
    daysUntil <= 30 ? urgencyFromDueDate(dueAt, now) : ("low" as const);
  const mileUrgent =
    milesUntil != null && milesUntil <= 1500
      ? urgencyFromMiles(milesUntil)
      : ("low" as const);

  let urgency = maxUrgency(dateUrgent, mileUrgent);

  const isOverdue = daysUntil < 0 || (milesUntil != null && milesUntil <= 0);
  const isDueSoon =
    !isOverdue &&
    (daysUntil <= 30 || (milesUntil != null && milesUntil <= 1500));

  if (!isOverdue && !isDueSoon) return null;

  if (isOverdue) urgency = "high";

  const kind: ServiceReminderKind = isOverdue
    ? "maintenance_overdue"
    : daysUntil <= 14 || (milesUntil != null && milesUntil <= 500)
      ? "maintenance_due"
      : "maintenance_soon";

  const parts: string[] = [];
  if (isOverdue) {
    parts.push("Overdue");
  } else if (daysUntil <= 30) {
    parts.push(`Due ${formatDueDate(dueAt)}`);
  }
  if (milesUntil != null && mileage != null) {
    if (milesUntil <= 0) {
      parts.push(`at ${mileage.toLocaleString()} mi`);
    } else {
      parts.push(`~${milesUntil.toLocaleString()} mi remaining`);
    }
  }

  return {
    id: `maint-${vehicle.id}-${def.key}`,
    kind,
    serviceName: def.label,
    vehicleId: vehicle.id,
    vehicleLabel: label,
    dueAt,
    dueMileage,
    currentMileage: mileage,
    message: parts.length > 0 ? parts.join(" · ") : def.label,
    urgency,
    ctaHref: "/portal/appointments",
    ctaLabel: "Book service",
  };
}

function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getServiceReminders(input: {
  vehicles: Vehicle[];
  repairOrders: RepairOrder[];
  invoices: Invoice[];
  appointments: Appointment[];
  now?: Date;
}): ServiceReminder[] {
  const { vehicles, repairOrders, invoices, appointments } = input;
  const now = input.now ?? new Date();
  const reminders: ServiceReminder[] = [];

  for (const apt of appointments) {
    if (!UPCOMING_APPOINTMENT_STATUSES.includes(apt.status)) continue;
    const when = toDate(apt.scheduledAt);
    if (when < now) continue;

    const vehicle = vehicles.find((v) => v.id === apt.vehicleId);
    const label = vehicle ? vehicleLabel(vehicle) : "Your vehicle";
    const daysUntil = daysBetween(now, when);

    reminders.push({
      id: `apt-${apt.id}`,
      kind: "appointment",
      serviceName: apt.title,
      vehicleId: apt.vehicleId ?? "",
      vehicleLabel: label,
      dueAt: when,
      message:
        daysUntil === 0
          ? `Today at ${formatTime(when)}`
          : daysUntil === 1
            ? `Tomorrow at ${formatTime(when)}`
            : `${formatDueDate(when)} at ${formatTime(when)}`,
      urgency: daysUntil <= 3 ? "high" : daysUntil <= 14 ? "medium" : "low",
      appointmentId: apt.id,
      ctaHref: "/portal/appointments",
      ctaLabel: "View appointment",
    });
  }

  const defaultMaintenanceKeys = ["oil_change", "tire_rotation"] as const;

  for (const vehicle of vehicles) {
    for (const key of defaultMaintenanceKeys) {
      const def = SERVICE_DEFINITIONS.find((d) => d.key === key);
      if (!def) continue;

      const lastService = findLastServiceDate(
        vehicle.id,
        def,
        repairOrders,
        invoices,
        appointments
      );

      const reminder = buildMaintenanceReminder(
        vehicle,
        def,
        lastService,
        now
      );
      if (reminder) reminders.push(reminder);
    }

  }

  const urgencyRank: Record<ServiceReminderUrgency, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return reminders.sort((a, b) => {
    const u = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (u !== 0) return u;
    const ta = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const tb = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
