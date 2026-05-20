"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { ServiceReminder } from "@/lib/serviceReminders";
import {
  countUnreadReminderIds,
  loadReadReminderIds,
  saveReadReminderIds,
} from "@/lib/notificationReadState";
import { ServiceRemindersList } from "@/components/notifications/ServiceRemindersList";
import { cn } from "@/lib/utils";

interface ServiceRemindersBellProps {
  userId: string;
  reminders: ServiceReminder[];
}

export function ServiceRemindersBell({
  userId,
  reminders,
}: ServiceRemindersBellProps) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReadIds(loadReadReminderIds(userId));
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const reminder of reminders) {
        if (!next.has(reminder.id)) {
          next.add(reminder.id);
          changed = true;
        }
      }
      if (changed) saveReadReminderIds(userId, next);
      return changed ? next : prev;
    });
  }, [reminders, userId]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) markAllAsRead();
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const unreadCount = countUnreadReminderIds(
    reminders.map((r) => r.id),
    readIds
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50",
          open && "border-blue-200 bg-blue-50 text-blue-700"
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96"
        >
          <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50/80 to-white px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">
              Maintenance and appointments
            </p>
          </div>
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
            <ServiceRemindersList
              reminders={reminders}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

