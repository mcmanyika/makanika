"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS, toDate } from "@/lib/utils";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "@/lib/firebase/config";
import { getCallableErrorMessage } from "@/lib/firebase/callableError";
import { getClientAppUrl } from "@/lib/appUrl";
import { Invoice } from "@/types";

export default function CustomerInvoicesPage() {
  const { user } = useAuth();
  const { shop, invoices, repairOrders, vehicles, loading } = useCustomerData();
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);

  if (loading) return <PageLoader />;

  const getContext = (inv: Invoice) => {
    const ro = repairOrders.find((r) => r.id === inv.repairOrderId);
    const vehicle = ro
      ? vehicles.find((v) => v.id === ro.vehicleId)
      : undefined;
    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : undefined;
    return { repairOrder: ro, vehicleLabel };
  };

  const handlePay = async (invoiceId: string, shopId: string) => {
    setError("");
    setPayingId(invoiceId);
    try {
      if (!isFirebaseConfigured) throw new Error("Firebase not configured");
      const createCheckout = httpsCallable(
        getFirebaseFunctions(),
        "createStripeCheckoutSession"
      );
      const result = await createCheckout({
        invoiceId,
        shopId,
        appUrl: getClientAppUrl(),
      });
      const data = result.data as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout session did not return a payment URL.");
    } catch (err) {
      console.error("createStripeCheckoutSession failed:", err);
      setError(
        getCallableErrorMessage(
          err,
          "Could not start checkout. Deploy Cloud Functions and set STRIPE_SECRET_KEY. See functions/README.md"
        )
      );
    } finally {
      setPayingId(null);
    }
  };

  const selectedContext = selected ? getContext(selected) : null;

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Click an invoice to view details
        </p>
      </header>
      <div className="space-y-4 p-4 sm:p-6">
        <FormFeedback error={error} />
        {invoices.length === 0 ? (
          <p className="text-slate-500">No invoices.</p>
        ) : (
          invoices.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelected(inv)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{inv.invoiceNumber}</CardTitle>
                <Badge
                  variant={inv.status === "paid" ? "success" : "warning"}
                >
                  {INVOICE_STATUS_LABELS[inv.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <InvoiceLineItemsTable lineItems={inv.lineItems} compact />
                <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Subtotal {formatCurrency(inv.subtotal)} + tax{" "}
                      {formatCurrency(inv.tax)} · Due{" "}
                      {formatDate(toDate(inv.dueDate))}
                    </p>
                    <p className="mt-1 text-xs text-blue-600">View full details</p>
                  </div>
                  {inv.status !== "paid" && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePay(inv.id, inv.shopId);
                      }}
                      disabled={payingId === inv.id}
                    >
                      {payingId === inv.id ? "Redirecting..." : "Pay with Stripe"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selected && selectedContext && (
        <InvoiceDetailDialog
          invoice={selected}
          shop={shop}
          customerName={user?.displayName ?? "Customer"}
          customerEmail={user?.email}
          repairOrder={selectedContext.repairOrder}
          vehicleLabel={selectedContext.vehicleLabel}
          onClose={() => setSelected(null)}
          onPay={
            selected.status !== "paid"
              ? () => handlePay(selected.id, selected.shopId)
              : undefined
          }
          paying={payingId === selected.id}
        />
      )}
    </div>
  );
}
