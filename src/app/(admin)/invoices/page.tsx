"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import { InvoiceLineItemsEditor } from "@/components/invoices/InvoiceLineItemsEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { createInvoice } from "@/lib/firebase/mutations";
import {
  cloneLineItems,
  computeInvoiceTotals,
  createEmptyLineItem,
  recalculateLineItem,
  sanitizeLineItemsForSave,
} from "@/lib/invoiceLineItems";
import {
  formatJobsSummary,
  getRepairOrderJobs,
} from "@/lib/repairOrderJobs";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { EstimateLineItem, Invoice, RepairOrder } from "@/types";

function repairOrderLabel(ro: RepairOrder): string {
  const summary =
    ro.description?.trim() ||
    formatJobsSummary(getRepairOrderJobs(ro)) ||
    "Repair order";
  return `${ro.orderNumber} — ${summary.slice(0, 50)}`;
}

function isRepairOrderInvoiced(
  ro: RepairOrder,
  invoicedRepairOrderIds: Set<string>
): boolean {
  return Boolean(ro.invoiceId) || invoicedRepairOrderIds.has(ro.id);
}
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "@/lib/firebase/config";

export default function InvoicesPage() {
  const { user } = useAuth();
  const {
    shop,
    invoices,
    customers,
    repairOrders,
    estimates,
    vehicles,
    getCustomer,
    loading,
  } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [repairOrderId, setRepairOrderId] = useState("");
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([
    createEmptyLineItem(),
  ]);
  const [tax, setTax] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentMsg, setPaymentMsg] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);

  const invoicedRepairOrderIds = useMemo(
    () => new Set(invoices.map((inv) => inv.repairOrderId)),
    [invoices]
  );

  const customerRepairOrders = useMemo(() => {
    if (!customerId) return [];
    return repairOrders.filter((ro) => ro.customerId === customerId);
  }, [repairOrders, customerId]);

  const customerOrders = useMemo(
    () =>
      customerRepairOrders.filter(
        (ro) => !isRepairOrderInvoiced(ro, invoicedRepairOrderIds)
      ),
    [customerRepairOrders, invoicedRepairOrderIds]
  );

  const totals = useMemo(() => {
    const sanitized = sanitizeLineItemsForSave(lineItems);
    const taxAmt = parseFloat(tax) || 0;
    return computeInvoiceTotals(sanitized, taxAmt);
  }, [lineItems, tax]);

  useEffect(() => {
    if (!repairOrderId) return;
    const order = repairOrders.find((r) => r.id === repairOrderId);
    const estimate = estimates.find(
      (e) => e.repairOrderId === repairOrderId || e.id === order?.estimateId
    );
    if (estimate?.lineItems?.length) {
      setLineItems(cloneLineItems(estimate.lineItems));
      setTax(String(estimate.tax));
      return;
    }
    if (order) {
      const jobs = getRepairOrderJobs(order).filter((j) => j.description.trim());
      if (jobs.length) {
        setLineItems(
          jobs.map((j) =>
            recalculateLineItem(createEmptyLineItem("labor"), {
              description: j.description.trim(),
            })
          )
        );
        setTax("");
      }
    }
  }, [repairOrderId, repairOrders, estimates]);

  if (loading) return <PageLoader />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured.");
      return;
    }
    if (!customerId || !repairOrderId || !dueDate) {
      setError("Customer, repair order, and due date are required.");
      return;
    }

    const items = sanitizeLineItemsForSave(lineItems);
    if (items.length === 0) {
      setError("Add at least one line item with description and amount.");
      return;
    }

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      setError("Invalid due date.");
      return;
    }

    const { subtotal, tax: taxAmt, total } = computeInvoiceTotals(
      items,
      parseFloat(tax) || 0
    );

    setSubmitting(true);
    try {
      await createInvoice({
        shopId: user.shopId,
        customerId,
        repairOrderId,
        lineItems: items,
        subtotal,
        tax: taxAmt,
        total,
        dueDate: due,
        status: "sent",
      });
      setSuccess("Invoice created.");
      setCustomerId("");
      setRepairOrderId("");
      setLineItems([createEmptyLineItem()]);
      setTax("");
      setDueDate("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const getInvoiceContext = (inv: Invoice) => {
    const ro = repairOrders.find((r) => r.id === inv.repairOrderId);
    const customer = getCustomer(inv.customerId);
    const vehicle = ro ? vehicles.find((v) => v.id === ro.vehicleId) : undefined;
    return {
      repairOrder: ro,
      customerName: customer
        ? `${customer.firstName} ${customer.lastName}`
        : "Customer",
      customerEmail: customer?.email,
      vehicleLabel: vehicle
        ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
        : undefined,
    };
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (row) => (
        <span className="font-medium">{row.invoiceNumber}</span>
      ),
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
      key: "items",
      header: "Lines",
      render: (row) => (
        <span className="text-slate-600">{row.lineItems?.length ?? 0}</span>
      ),
    },
    {
      key: "total",
      header: "Amount",
      render: (row) => formatCurrency(row.total),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const variant =
          row.status === "paid"
            ? "success"
            : row.status === "overdue"
              ? "danger"
              : row.status === "sent"
                ? "warning"
                : "neutral";
        return (
          <Badge variant={variant}>
            {INVOICE_STATUS_LABELS[row.status]}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due",
      render: (row) => formatDate(row.dueDate as Date),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.status !== "paid" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation();
              setPaymentMsg("");
              try {
                if (!isFirebaseConfigured) throw new Error("Firebase not configured");
                const createPaymentLink = httpsCallable(
                  getFirebaseFunctions(),
                  "createStripePaymentLink"
                );
                await createPaymentLink({
                  invoiceId: row.id,
                  shopId: row.shopId,
                });
                setPaymentMsg(
                  "Payment link created. Check the invoice in Firestore for the URL."
                );
              } catch {
                setPaymentMsg(
                  "Deploy Cloud Functions to generate Stripe payment links. See functions/README."
                );
              }
            }}
          >
            <ExternalLink className="h-3 w-3" />
            Payment Link
          </Button>
        ) : (
          <span className="text-slate-400">Paid</span>
        ),
    },
  ];

  const selectedContext = selected ? getInvoiceContext(selected) : null;

  return (
    <div>
      <AdminHeader title="Invoices" subtitle="Itemized billing and Stripe payments" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
              setLineItems([createEmptyLineItem()]);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        <FormFeedback error={error} success={success} />
        {paymentMsg && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            {paymentMsg}
          </p>
        )}

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>Create itemized invoice</CardTitle>
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
                          setRepairOrderId("");
                          setLineItems([createEmptyLineItem()]);
                          setTax("");
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
                      <label className="mb-1 block text-sm font-medium">Repair order *</label>
                      <select
                        required
                        value={repairOrderId}
                        onChange={(e) => setRepairOrderId(e.target.value)}
                        disabled={!customerId}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">Select repair order</option>
                        {customerOrders.map((ro) => (
                          <option key={ro.id} value={ro.id}>
                            {repairOrderLabel(ro)}
                          </option>
                        ))}
                      </select>
                      {customerId && customerRepairOrders.length === 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          No repair orders for this customer.{" "}
                          <Link
                            href="/repair-orders"
                            className="font-medium underline"
                          >
                            Create a repair order
                          </Link>{" "}
                          first.
                        </p>
                      )}
                      {customerId &&
                        customerRepairOrders.length > 0 &&
                        customerOrders.length === 0 && (
                          <p className="mt-1 text-xs text-amber-700">
                            All repair orders for this customer already have an
                            invoice.
                          </p>
                        )}
                      <p className="mt-1 text-xs text-slate-500">
                        Prefills line items from the linked estimate or repair
                        order jobs when available.
                      </p>
                    </div>
                  </div>

                  <InvoiceLineItemsEditor
                    lineItems={lineItems}
                    onChange={setLineItems}
                  />

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">Subtotal</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(totals.subtotal)}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Tax ($)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">Total due</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(totals.total)}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Due date *</label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : "Create invoice"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
          data={invoices}
          keyExtractor={(r) => r.id}
          onRowClick={setSelected}
          emptyMessage="No invoices yet"
        />

        {selected && selectedContext && (
          <InvoiceDetailDialog
            invoice={selected}
            shop={shop}
            customerName={selectedContext.customerName}
            customerEmail={selectedContext.customerEmail}
            repairOrder={selectedContext.repairOrder}
            vehicleLabel={selectedContext.vehicleLabel}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
