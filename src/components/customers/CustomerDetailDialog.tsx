"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  APPOINTMENT_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  toDate,
} from "@/lib/utils";
import {
  Appointment,
  Customer,
  Invoice,
  RepairOrder,
  Vehicle,
} from "@/types";

interface CustomerDetailDialogProps {
  customer: Customer;
  vehicles: Vehicle[];
  repairOrders: RepairOrder[];
  invoices: Invoice[];
  appointments: Appointment[];
  onClose: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

export function CustomerDetailDialog({
  customer,
  vehicles,
  repairOrders,
  invoices,
  appointments,
  onClose,
}: CustomerDetailDialogProps) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const location = [customer.city, customer.state].filter(Boolean).join(", ");
  const addressLine = [customer.address, customer.city, customer.state, customer.zip]
    .filter(Boolean)
    .join(", ");

  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);
  const outstanding = invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue"
  );

  const recentRepairOrders = [...repairOrders]
    .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
    .slice(0, 5);

  const recentAppointments = [...appointments]
    .sort(
      (a, b) =>
        toDate(b.scheduledAt).getTime() - toDate(a.scheduledAt).getTime()
    )
    .slice(0, 5);

  const recentInvoices = [...invoices]
    .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2
              id="customer-detail-title"
              className="text-lg font-bold text-slate-900"
            >
              {fullName}
            </h2>
            <p className="text-sm text-slate-500">Customer profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{vehicles.length}</p>
              <p className="text-xs text-slate-500">Vehicles</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {repairOrders.length}
              </p>
              <p className="text-xs text-slate-500">Repair orders</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(paidTotal)}
              </p>
              <p className="text-xs text-slate-500">Lifetime paid</p>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">
                <a
                  href={`mailto:${customer.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {customer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {location && (
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-900">{location}</dd>
              </div>
            )}
            {addressLine && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium text-slate-900">{addressLine}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Customer since</dt>
              <dd className="font-medium text-slate-900">
                {formatDate(toDate(customer.createdAt))}
              </dd>
            </div>
            {customer.userId && (
              <div>
                <dt className="text-slate-500">Portal account</dt>
                <dd className="font-medium text-green-700">Linked</dd>
              </div>
            )}
          </dl>

          {customer.notes && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}

          {outstanding.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {outstanding.length} outstanding invoice
              {outstanding.length !== 1 ? "s" : ""} (
              {formatCurrency(outstanding.reduce((s, i) => s + i.total, 0))})
            </div>
          )}

          <Section title="Vehicles">
            {vehicles.length === 0 ? (
              <p className="text-sm text-slate-500">No vehicles on file.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {vehicles.map((v) => (
                  <li key={v.id} className="px-4 py-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {v.year} {v.make} {v.model}
                      {v.trim ? ` ${v.trim}` : ""}
                    </p>
                    <p className="text-slate-500">
                      {[v.licensePlate, v.vin, v.color]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent repair orders">
            {recentRepairOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No repair orders yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentRepairOrders.map((ro) => (
                  <li
                    key={ro.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {ro.orderNumber}
                      </p>
                      <p className="line-clamp-1 text-slate-500">
                        {ro.description}
                      </p>
                    </div>
                    <Badge variant="neutral">
                      {REPAIR_STATUS_LABELS[ro.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent appointments">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentAppointments.map((apt) => (
                  <li
                    key={apt.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{apt.title}</p>
                      <p className="text-slate-500">
                        {formatDateTime(toDate(apt.scheduledAt))}
                      </p>
                    </div>
                    <Badge variant="info">
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent invoices">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-slate-500">
                        {formatDate(toDate(inv.dueDate))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(inv.total)}
                      </p>
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "overdue"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
