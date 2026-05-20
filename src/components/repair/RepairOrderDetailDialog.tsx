"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RepairProgressTracker } from "@/components/ui/RepairProgressTracker";
import { MediaGallery } from "@/components/repair/MediaGallery";
import { RepairOrderJobsList } from "@/components/repair/RepairOrderJobsList";
import { useRepairOrderMedia } from "@/hooks/useRepairOrderMedia";
import { getEffectiveOrderStatus } from "@/lib/repairOrderJobs";
import {
  formatDate,
  formatDateTime,
  REPAIR_STATUS_LABELS,
  toDate,
} from "@/lib/utils";
import { Customer, Invoice, RepairOrder, Vehicle } from "@/types";

interface RepairOrderDetailDialogProps {
  order: RepairOrder;
  customer: Customer | undefined;
  vehicle: Vehicle | undefined;
  invoice: Invoice | undefined;
  shopId: string | undefined;
  onClose: () => void;
  onEditJobs?: () => void;
  onUploadFiles?: () => void;
}

function statusBadgeVariant(
  status: RepairOrder["status"]
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "ready_for_pickup" || status === "completed") return "success";
  if (status === "waiting_approval") return "warning";
  if (status === "diagnosing") return "neutral";
  return "info";
}

export function RepairOrderDetailDialog({
  order,
  customer,
  vehicle,
  invoice,
  shopId,
  onClose,
  onEditJobs,
  onUploadFiles,
}: RepairOrderDetailDialogProps) {
  const { data: media, loading: mediaLoading } = useRepairOrderMedia(
    shopId,
    order.id
  );

  const customerName = customer
    ? `${customer.firstName} ${customer.lastName}`
    : "—";
  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ro-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="ro-detail-title" className="text-lg font-bold text-slate-900">
              {order.orderNumber}
            </h2>
            <p className="text-sm text-slate-500">Repair order details</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(getEffectiveOrderStatus(order))}>
              {REPAIR_STATUS_LABELS[getEffectiveOrderStatus(order)]}
            </Badge>
            {invoice && (
              <span className="text-sm text-slate-600">{invoice.invoiceNumber}</span>
            )}
          </div>

          <RepairProgressTracker status={getEffectiveOrderStatus(order)} compact />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">{customerName}</dd>
              {customer?.phone && (
                <dd className="text-slate-600">{customer.phone}</dd>
              )}
            </div>
            <div>
              <dt className="text-slate-500">Vehicle</dt>
              <dd className="font-medium text-slate-900">{vehicleLabel}</dd>
              {vehicle?.licensePlate && (
                <dd className="text-slate-600">{vehicle.licensePlate}</dd>
              )}
            </div>
            <div>
              <dt className="text-slate-500">Assigned mechanic</dt>
              <dd className="font-medium text-slate-900">
                {order.assignedMechanicName ?? "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Received</dt>
              <dd className="font-medium text-slate-900">
                {formatDateTime(toDate(order.receivedAt))}
              </dd>
            </div>
            {order.completedAt && (
              <div>
                <dt className="text-slate-500">Completed</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateTime(toDate(order.completedAt))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Files attached</dt>
              <dd className="font-medium text-slate-900">
                {order.mediaIds?.length ?? 0}
              </dd>
            </div>
          </dl>

          {order.customerConcerns && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Customer concerns</p>
              <p className="mt-1 whitespace-pre-wrap">{order.customerConcerns}</p>
            </div>
          )}

          {order.internalNotes && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium">Internal notes</p>
              <p className="mt-1 whitespace-pre-wrap">{order.internalNotes}</p>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Jobs on card</h3>
            <RepairOrderJobsList order={order} />
          </section>

          {invoice && (
            <section className="rounded-lg border border-slate-200 p-4 text-sm">
              <p className="font-medium text-slate-900">Linked invoice</p>
              <p className="text-slate-600">
                {invoice.invoiceNumber} · Due{" "}
                {formatDate(toDate(invoice.dueDate))}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Photos & documents
            </h3>
            <MediaGallery
              items={media}
              loading={mediaLoading}
              title={order.orderNumber}
            />
          </section>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
            {onEditJobs && (
              <Button type="button" variant="outline" className="flex-1" onClick={onEditJobs}>
                Edit jobs
              </Button>
            )}
            {onUploadFiles && (
              <Button type="button" variant="outline" className="flex-1" onClick={onUploadFiles}>
                Upload files
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
