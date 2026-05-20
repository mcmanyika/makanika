"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { Invoice, RepairOrder, Shop } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  toDate,
} from "@/lib/utils";

interface InvoiceDetailDialogProps {
  invoice: Invoice;
  shop: Shop | null;
  customerName: string;
  customerEmail?: string;
  repairOrder?: RepairOrder | null;
  vehicleLabel?: string;
  onClose: () => void;
  onPay?: () => void;
  paying?: boolean;
}

export function InvoiceDetailDialog({
  invoice,
  shop,
  customerName,
  customerEmail,
  repairOrder,
  vehicleLabel,
  onClose,
  onPay,
  paying = false,
}: InvoiceDetailDialogProps) {
  const lineItems = invoice.lineItems ?? [];
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!shop) return;
    setDownloading(true);
    try {
      downloadInvoicePdf({
        invoice,
        shop,
        customerName,
        customerEmail,
        repairOrderNumber: repairOrder?.orderNumber,
        vehicleLabel,
        serviceDescription: repairOrder?.description,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="invoice-detail-title" className="text-lg font-bold text-slate-900">
              {invoice.invoiceNumber}
            </h2>
            <p className="text-sm text-slate-500">Invoice details</p>
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
            <Badge
              variant={
                invoice.status === "paid"
                  ? "success"
                  : invoice.status === "overdue"
                    ? "danger"
                    : "warning"
              }
            >
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
            {repairOrder && (
              <span className="text-sm text-slate-600">
                {repairOrder.orderNumber}
              </span>
            )}
          </div>

          {(vehicleLabel || repairOrder?.description) && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              {vehicleLabel && (
                <p className="font-medium text-slate-900">{vehicleLabel}</p>
              )}
              {repairOrder?.description && (
                <p className="mt-1 text-slate-600">{repairOrder.description}</p>
              )}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Due date</dt>
              <dd className="font-medium text-slate-900">
                {formatDate(toDate(invoice.dueDate))}
              </dd>
            </div>
            {invoice.paidAt && (
              <div>
                <dt className="text-slate-500">Paid on</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateTime(toDate(invoice.paidAt))}
                </dd>
              </div>
            )}
            {invoice.amountPaid > 0 && (
              <div>
                <dt className="text-slate-500">Amount paid</dt>
                <dd className="font-medium text-green-700">
                  {formatCurrency(invoice.amountPaid)}
                </dd>
              </div>
            )}
          </dl>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Itemized charges
            </h3>
            <InvoiceLineItemsTable lineItems={lineItems} />
          </section>

          <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!shop || downloading}
            >
              <Download className="h-4 w-4" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            {invoice.status !== "paid" && onPay && (
              <Button className="flex-1" onClick={onPay} disabled={paying}>
                {paying ? "Redirecting..." : "Pay with Stripe"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
