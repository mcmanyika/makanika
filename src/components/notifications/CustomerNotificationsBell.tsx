"use client";

import { useMemo } from "react";
import { ServiceRemindersBell } from "@/components/notifications/ServiceRemindersBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { getServiceReminders } from "@/lib/serviceReminders";

export function CustomerNotificationsBell() {
  const { user } = useAuth();
  const { vehicles, repairOrders, invoices, appointments, loading } =
    useCustomerData();

  const reminders = useMemo(
    () =>
      getServiceReminders({
        vehicles,
        repairOrders,
        invoices,
        appointments,
      }),
    [vehicles, repairOrders, invoices, appointments]
  );

  if (loading || !user?.id) return null;

  return <ServiceRemindersBell userId={user.id} reminders={reminders} />;
}
