"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { updateEstimateApproval } from "@/lib/firebase/mutations";
import {
  formatCurrency,
  ESTIMATE_STATUS_LABELS,
  formatDate,
} from "@/lib/utils";
import { EstimateApprovalStatus } from "@/types";

export default function CustomerEstimatesPage() {
  const { estimates, repairOrders, loading, error } = useCustomerData();
  const [statuses, setStatuses] = useState<Record<string, EstimateApprovalStatus>>(
    {}
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  if (loading) return <PageLoader />;

  const handleAction = async (
    id: string,
    action: EstimateApprovalStatus
  ) => {
    setSaving(id);
    setActionError("");
    try {
      await updateEstimateApproval(id, action);
      setStatuses((prev) => ({ ...prev, [id]: action }));
    } catch (err) {
      console.error(err);
      setActionError("Failed to update estimate. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const getOrderNumber = (repairOrderId: string) =>
    repairOrders.find((ro) => ro.id === repairOrderId)?.orderNumber ??
    repairOrderId;

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
        <p className="text-slate-500">Review and approve repair estimates</p>
      </header>
      <div className="space-y-6 p-4 sm:p-6">
        <FormFeedback error={error ?? actionError} />
        {estimates.length === 0 ? (
          <p className="text-slate-500">
            No estimates yet. When your shop sends an estimate for a repair, it
            will appear here for your approval.
          </p>
        ) : (
          estimates.map((est) => {
            const status = statuses[est.id] ?? est.approvalStatus;
            const items = est.lineItems ?? [];
            return (
              <Card key={est.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {getOrderNumber(est.repairOrderId)}
                    </CardTitle>
                    {est.validUntil && (
                      <p className="mt-1 text-sm text-slate-500">
                        Valid until {formatDate(est.validUntil as Date)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      status === "approved"
                        ? "success"
                        : status === "pending"
                          ? "warning"
                          : status === "declined"
                            ? "danger"
                            : "info"
                    }
                  >
                    {ESTIMATE_STATUS_LABELS[status]}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="mb-4 text-sm text-slate-500">
                      No line items on this estimate.
                    </p>
                  ) : (
                    <table className="mb-4 w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-2">Description</th>
                          <th className="pb-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((li) => (
                          <tr key={li.id} className="border-b border-slate-50">
                            <td className="py-2">{li.description}</td>
                            <td className="py-2 text-right">
                              {formatCurrency(li.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mb-4 flex justify-between border-t pt-4 font-semibold">
                    <span>Total (incl. tax)</span>
                    <span>{formatCurrency(est.total)}</span>
                  </div>
                  {status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={saving === est.id}
                        onClick={() => handleAction(est.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={saving === est.id}
                        onClick={() =>
                          handleAction(est.id, "changes_requested")
                        }
                      >
                        Request Changes
                      </Button>
                      <Button
                        variant="danger"
                        disabled={saving === est.id}
                        onClick={() => handleAction(est.id, "declined")}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
