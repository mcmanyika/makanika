"use client";

import Link from "next/link";
import { AlertTriangle, Calendar, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  ServiceReminder,
  ServiceReminderKind,
} from "@/lib/serviceReminders";

function kindLabel(kind: ServiceReminderKind): string {
  switch (kind) {
    case "appointment":
      return "Scheduled";
    case "maintenance_overdue":
      return "Overdue";
    case "maintenance_due":
      return "Due soon";
    case "maintenance_soon":
      return "Coming up";
    default:
      return "Reminder";
  }
}

function kindBadgeVariant(
  kind: ServiceReminderKind
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (kind === "appointment") return "info";
  if (kind === "maintenance_overdue") return "danger";
  if (kind === "maintenance_due") return "warning";
  return "neutral";
}

function borderClass(reminder: ServiceReminder): string {
  if (reminder.urgency === "high") return "border-l-red-500";
  if (reminder.urgency === "medium") return "border-l-amber-500";
  return "border-l-blue-500";
}

function IconForReminder({ kind }: { kind: ServiceReminderKind }) {
  if (kind === "appointment") {
    return <Calendar className="h-5 w-5 shrink-0 text-blue-600" />;
  }
  if (kind === "maintenance_overdue") {
    return <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />;
  }
  return <Wrench className="h-5 w-5 shrink-0 text-amber-600" />;
}

interface ServiceRemindersListProps {
  reminders: ServiceReminder[];
  onNavigate?: () => void;
}

export function ServiceRemindersList({
  reminders,
  onNavigate,
}: ServiceRemindersListProps) {
  if (reminders.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        No notifications right now.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {reminders.map((reminder) => (
        <li
          key={reminder.id}
          className={`border-l-4 p-4 ${borderClass(reminder)}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <IconForReminder kind={reminder.kind} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {reminder.serviceName}
                  </p>
                  <Badge variant={kindBadgeVariant(reminder.kind)}>
                    {kindLabel(reminder.kind)}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{reminder.vehicleLabel}</p>
                <p className="mt-0.5 text-sm text-slate-500">{reminder.message}</p>
              </div>
            </div>
            <Link
              href={reminder.ctaHref}
              onClick={onNavigate}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              {reminder.ctaLabel}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
