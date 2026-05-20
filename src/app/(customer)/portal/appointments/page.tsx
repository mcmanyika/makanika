"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { createAppointment } from "@/lib/firebase/mutations";
import { formatDateTime } from "@/lib/utils";

export default function CustomerAppointmentsPage() {
  const { user } = useAuth();
  const { appointments, vehicles, loading } = useCustomerData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const openForm = () => {
    setShowForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId || !user?.customerId) {
      setError(
        "Your account is missing shop or customer profile. Try signing out and back in."
      );
      return;
    }

    if (!title.trim()) {
      setError("Please describe the service you need.");
      return;
    }

    if (!scheduledAt) {
      setError("Please choose a date and time.");
      return;
    }

    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      setError("Invalid date and time.");
      return;
    }

    if (when < new Date()) {
      setError("Please pick a future date and time.");
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        shopId: user.shopId,
        customerId: user.customerId,
        title: title.trim(),
        scheduledAt: when,
        vehicleId: vehicleId || undefined,
        description: notes.trim() || undefined,
        status: "scheduled",
      });

      setSuccess("Appointment requested! Your shop will confirm soon.");
      setTitle("");
      setScheduledAt("");
      setVehicleId("");
      setNotes("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not book appointment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  const sorted = [...appointments].sort(
    (a, b) =>
      new Date(a.scheduledAt as Date).getTime() -
      new Date(b.scheduledAt as Date).getTime()
  );

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <Button type="button" onClick={openForm}>
            Book appointment
          </Button>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {showForm && (
          <div ref={formRef}>
          <Card>
            <CardHeader>
              <CardTitle>Request appointment</CardTitle>
              <p className="text-sm text-slate-500">
                Pick a time — the shop will confirm your booking.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Service needed
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Oil change, brake inspection"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {vehicles.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Vehicle (optional)
                    </label>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.year} {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Preferred date & time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Anything else we should know?"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit request"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => {
                      setShowForm(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="text-slate-500">
            No appointments scheduled.{" "}
            {!showForm && (
              <button
                type="button"
                onClick={openForm}
                className="font-medium text-blue-600 hover:underline"
              >
                Book your first appointment
              </button>
            )}
          </p>
        ) : (
          sorted.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div>
                  <p className="font-semibold text-slate-900">{apt.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(apt.scheduledAt as Date)} ·{" "}
                    {apt.durationMinutes} min
                  </p>
                  {apt.description && (
                    <p className="mt-1 text-sm text-slate-600">
                      {apt.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    apt.status === "confirmed"
                      ? "success"
                      : apt.status === "cancelled"
                        ? "danger"
                        : "info"
                  }
                >
                  {apt.status.replace("_", " ")}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
