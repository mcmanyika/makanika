"use client";

import { useMemo, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { AppointmentFiltersBar } from "@/components/appointments/AppointmentFiltersBar";
import type {
  AppointmentDateFilter,
  AppointmentSort,
} from "@/components/appointments/AppointmentFiltersBar";
import { assertNoAppointmentConflict } from "@/lib/appointmentConflicts";
import { createAppointment, updateAppointment } from "@/lib/firebase/mutations";
import { filterAppointments } from "@/lib/appointmentFilters";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  formatDateTime,
  toDate,
  toDatetimeLocalValue,
} from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/types";

function statusBadgeVariant(
  status: AppointmentStatus
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "confirmed" || status === "completed") return "success";
  if (status === "cancelled" || status === "no_show") return "danger";
  if (status === "in_progress") return "warning";
  return "info";
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { appointments, customers, vehicles, getCustomer, loading } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(
    "all"
  );
  const [dateFilter, setDateFilter] = useState<AppointmentDateFilter>("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [sort, setSort] = useState<AppointmentSort>("date_asc");

  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);

  const filteredAppointments = useMemo(
    () =>
      filterAppointments(appointments, {
        search,
        statusFilter,
        dateFilter,
        customerFilter,
        sort,
        getCustomer,
        vehicles,
      }),
    [
      appointments,
      search,
      statusFilter,
      dateFilter,
      customerFilter,
      sort,
      getCustomer,
      vehicles,
    ]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    customerFilter !== "all" ||
    sort !== "date_asc";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomerFilter("all");
    setSort("date_asc");
  };
  const isEditing = !!editingId;

  if (loading) return <PageLoader />;

  const resetForm = () => {
    setEditingId(null);
    setCustomerId("");
    setVehicleId("");
    setTitle("");
    setScheduledAt("");
    setDuration("60");
    setStatus("confirmed");
    setNotes("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const openEditForm = (apt: Appointment) => {
    setEditingId(apt.id);
    setCustomerId(apt.customerId);
    setVehicleId(apt.vehicleId ?? "");
    setTitle(apt.title);
    setScheduledAt(toDatetimeLocalValue(toDate(apt.scheduledAt)));
    setDuration(String(apt.durationMinutes));
    setStatus(apt.status);
    setNotes(apt.description ?? "");
    setShowForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured.");
      return;
    }
    if (!customerId || !title.trim() || !scheduledAt) {
      setError("Customer, title, and date/time are required.");
      return;
    }

    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      setError("Invalid date and time.");
      return;
    }

    const durationMinutes = parseInt(duration, 10) || 60;

    try {
      assertNoAppointmentConflict(
        appointments,
        {
          id: editingId ?? undefined,
          scheduledAt: when,
          durationMinutes,
          status,
          shopId: user.shopId,
        },
        {
          excludeId: editingId ?? undefined,
          shopId: user.shopId,
          getCustomerName: (id) => {
            const c = getCustomer(id);
            return c ? `${c.firstName} ${c.lastName}` : "Customer";
          },
        }
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "This time slot is not available."
      );
      return;
    }

    const payload = {
      customerId,
      title,
      scheduledAt: when,
      durationMinutes,
      vehicleId: vehicleId || undefined,
      description: notes || undefined,
      status,
    };

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateAppointment(editingId, payload);
        setSuccess("Appointment updated.");
      } else {
        await createAppointment({
          shopId: user.shopId,
          ...payload,
        });
        setSuccess("Appointment booked.");
      }
      closeForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Failed to update appointment."
            : "Failed to book appointment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Appointments" subtitle="Schedule and manage bookings" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button type="button" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>

        <FormFeedback error={error} success={success} />

        <AssistantPanel
          title="Scheduling assistant"
          hint="Book or reschedule for customers, check open slots, or list today's appointments."
          defaultOpen={false}
        />

        {appointments.length > 0 && (
          <AppointmentFiltersBar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customerFilter={customerFilter}
            onCustomerFilterChange={setCustomerFilter}
            sort={sort}
            onSortChange={setSort}
            customers={customers}
            filteredCount={filteredAppointments.length}
            totalCount={appointments.length}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {isEditing ? "Edit appointment" : "Book appointment"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Customer *</label>
                      <select
                        required
                        value={customerId}
                        onChange={(e) => {
                          setCustomerId(e.target.value);
                          setVehicleId("");
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Vehicle</label>
                      <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        disabled={!customerId}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">Optional</option>
                        {customerVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.year} {v.make} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Service *</label>
                    <input
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Date & time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Duration (min)</label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                      className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {APPOINTMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {APPOINTMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? "Saving..."
                        : isEditing
                          ? "Save changes"
                          : "Book appointment"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appointments.length === 0 ? (
            <p className="text-slate-500 md:col-span-2 xl:col-span-3">No appointments yet.</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-slate-500 md:col-span-2 xl:col-span-3">
              No appointments match your filters.
            </p>
          ) : (
            filteredAppointments.map((apt) => {
              const customer = getCustomer(apt.customerId);
              const vehicle = vehicles.find((v) => v.id === apt.vehicleId);
              return (
                <Card key={apt.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-base">{apt.title}</CardTitle>
                    <Badge variant={statusBadgeVariant(apt.status)}>
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600">
                      {customer
                        ? `${customer.firstName} ${customer.lastName}`
                        : "—"}
                    </p>
                    {vehicle && (
                      <p className="text-xs text-slate-500">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                    )}
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(toDate(apt.scheduledAt))}
                    </p>
                    <p className="text-xs text-slate-500">{apt.durationMinutes} min</p>
                    {apt.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{apt.description}</p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => openEditForm(apt)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
