"use client";

import { useMemo, useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { formatCurrency, formatDate, REPAIR_STATUS_LABELS, toDate } from "@/lib/utils";
import { Invoice, RepairOrder } from "@/types";

const HISTORY_STATUSES = ["completed", "ready_for_pickup"] as const;

export default function CustomerHistoryPage() {
  const { user } = useAuth();
  const { shop, repairOrders, vehicles, invoices, loading } = useCustomerData();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<RepairOrder | null>(
    null
  );

  const paidInvoiceByRepairOrderId = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const inv of invoices) {
      if (inv.status === "paid" && inv.repairOrderId) {
        map.set(inv.repairOrderId, inv);
      }
    }
    return map;
  }, [invoices]);

  const historyOrders = useMemo(() => {
    return repairOrders
      .filter(
        (r) =>
          HISTORY_STATUSES.includes(
            r.status as (typeof HISTORY_STATUSES)[number]
          ) || paidInvoiceByRepairOrderId.has(r.id)
      )
      .sort((a, b) => {
        const aInv = paidInvoiceByRepairOrderId.get(a.id);
        const bInv = paidInvoiceByRepairOrderId.get(b.id);
        const aDate = aInv?.paidAt ?? a.completedAt ?? a.updatedAt;
        const bDate = bInv?.paidAt ?? b.completedAt ?? b.updatedAt;
        return toDate(bDate).getTime() - toDate(aDate).getTime();
      });
  }, [repairOrders, paidInvoiceByRepairOrderId]);

  const handleRowClick = (row: RepairOrder) => {
    const inv = paidInvoiceByRepairOrderId.get(row.id);
    if (inv) {
      setSelectedInvoice(inv);
      setSelectedRepairOrder(row);
    }
  };

  const vehicleLabel = selectedRepairOrder
    ? (() => {
        const v = vehicles.find((x) => x.id === selectedRepairOrder.vehicleId);
        return v ? `${v.year} ${v.make} ${v.model}` : undefined;
      })()
    : undefined;

  if (loading) return <PageLoader />;

  const columns: Column<RepairOrder>[] = [
    { key: "orderNumber", header: "RO #" },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (row) => {
        const v = vehicles.find((x) => x.id === row.vehicleId);
        return v ? `${v.year} ${v.make} ${v.model}` : "—";
      },
    },
    { key: "description", header: "Service" },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const paid = paidInvoiceByRepairOrderId.get(row.id);
        if (paid) {
          return <Badge variant="success">Paid</Badge>;
        }
        return (
          <Badge variant="success">{REPAIR_STATUS_LABELS[row.status]}</Badge>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => {
        const inv = paidInvoiceByRepairOrderId.get(row.id);
        return inv ? formatCurrency(inv.total) : "—";
      },
    },
    {
      key: "completedAt",
      header: "Date",
      render: (row) => {
        const inv = paidInvoiceByRepairOrderId.get(row.id);
        const date = inv?.paidAt ?? row.completedAt ?? row.updatedAt;
        return formatDate(toDate(date));
      },
    },
  ];

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Service History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Click a row to view invoice details
        </p>
      </header>
      <div className="p-4 sm:p-6">
        <DataTable
          columns={columns}
          data={historyOrders}
          keyExtractor={(r) => r.id}
          onRowClick={handleRowClick}
          emptyMessage="No completed services yet. Paid invoices will appear here."
        />
      </div>

      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          shop={shop}
          customerName={user?.displayName ?? "Customer"}
          customerEmail={user?.email}
          repairOrder={selectedRepairOrder}
          vehicleLabel={vehicleLabel}
          onClose={() => {
            setSelectedInvoice(null);
            setSelectedRepairOrder(null);
          }}
        />
      )}
    </div>
  );
}
