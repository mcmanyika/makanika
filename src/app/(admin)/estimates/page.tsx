"use client";

import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { InvoiceLineItemsEditor } from "@/components/invoices/InvoiceLineItemsEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { createEstimate } from "@/lib/firebase/mutations";
import {
  computeInvoiceTotals,
  createEmptyLineItem,
  sanitizeLineItemsForSave,
} from "@/lib/invoiceLineItems";
import {
  ESTIMATE_STATUS_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import { Estimate, EstimateLineItem } from "@/types";

export default function EstimatesPage() {
  const { user } = useAuth();
  const {
    estimates,
    customers,
    repairOrders,
    getCustomer,
    loading,
  } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [repairOrderId, setRepairOrderId] = useState("");
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([
    createEmptyLineItem(),
  ]);
  const [tax, setTax] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedOrder = repairOrders.find((r) => r.id === repairOrderId);

  const eligibleOrders = useMemo(
    () =>
      repairOrders.filter(
        (ro) => !estimates.some((e) => e.repairOrderId === ro.id)
      ),
    [repairOrders, estimates]
  );

  const totals = useMemo(() => {
    const sanitized = sanitizeLineItemsForSave(lineItems);
    return computeInvoiceTotals(sanitized, parseFloat(tax) || 0);
  }, [lineItems, tax]);

  if (loading) return <PageLoader />;

  const resetForm = () => {
    setRepairOrderId("");
    setLineItems([createEmptyLineItem()]);
    setTax("");
    setValidUntil("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured.");
      return;
    }
    if (!repairOrderId || !selectedOrder) {
      setError("Select a repair order.");
      return;
    }

    const items = sanitizeLineItemsForSave(lineItems);
    if (items.length === 0) {
      setError("Add at least one line item with description and amount.");
      return;
    }

    let validUntilDate: Date | undefined;
    if (validUntil) {
      validUntilDate = new Date(validUntil);
      if (Number.isNaN(validUntilDate.getTime())) {
        setError("Invalid valid-until date.");
        return;
      }
    }

    const { subtotal, tax: taxAmt, total } = computeInvoiceTotals(
      items,
      parseFloat(tax) || 0
    );

    setSubmitting(true);
    try {
      await createEstimate({
        shopId: user.shopId,
        customerId: selectedOrder.customerId,
        repairOrderId,
        lineItems: items,
        subtotal,
        tax: taxAmt,
        total,
        validUntil: validUntilDate,
      });
      setSuccess("Estimate sent to customer for approval.");
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create estimate."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Estimate>[] = [
    {
      key: "repairOrder",
      header: "Repair order",
      render: (row) => {
        const ro = repairOrders.find((r) => r.id === row.repairOrderId);
        return (
          <span className="font-medium text-blue-600">
            {ro?.orderNumber ?? row.repairOrderId}
          </span>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => {
        const c = getCustomer(row.customerId);
        return c ? `${c.firstName} ${c.lastName}` : "—";
      },
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.total),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant={
            row.approvalStatus === "approved"
              ? "success"
              : row.approvalStatus === "pending"
                ? "warning"
                : row.approvalStatus === "declined"
                  ? "danger"
                  : "info"
          }
        >
          {ESTIMATE_STATUS_LABELS[row.approvalStatus]}
        </Badge>
      ),
    },
    {
      key: "sent",
      header: "Sent",
      render: (row) =>
        row.sentAt ? formatDate(row.sentAt as Date) : "—",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Estimates"
        subtitle="Create and send repair estimates for customer approval"
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
              setError("");
              setSuccess("");
              setTimeout(
                () => formRef.current?.scrollIntoView({ behavior: "smooth" }),
                50
              );
            }}
            disabled={eligibleOrders.length === 0}
          >
            <Plus className="h-4 w-4" />
            New estimate
          </Button>
        </div>

        <FormFeedback error={error} success={success} />

        {eligibleOrders.length === 0 && estimates.length === 0 && (
          <p className="text-sm text-slate-500">
            Create a repair order first, then add an estimate here. Customers
            will see it under Portal → Estimates.
          </p>
        )}

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>New estimate</CardTitle>
                <p className="text-sm text-slate-500">
                  Customer must approve before work is billed on an invoice.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Repair order *
                    </label>
                    <select
                      required
                      value={repairOrderId}
                      onChange={(e) => setRepairOrderId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Select repair order</option>
                      {eligibleOrders.map((ro) => {
                        const c = getCustomer(ro.customerId);
                        return (
                          <option key={ro.id} value={ro.id}>
                            {ro.orderNumber}
                            {c ? ` — ${c.firstName} ${c.lastName}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <InvoiceLineItemsEditor
                    lineItems={lineItems}
                    onChange={setLineItems}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Tax ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Valid until (optional)
                      </label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="mt-1 flex justify-between font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Sending..." : "Send to customer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
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

        <DataTable
          columns={columns}
          data={[...estimates].sort(
            (a, b) =>
              new Date(b.createdAt as Date).getTime() -
              new Date(a.createdAt as Date).getTime()
          )}
          keyExtractor={(row) => row.id}
          emptyMessage="No estimates yet. Create one to send to a customer."
        />
                    </div>
                  </div>
  );
}
