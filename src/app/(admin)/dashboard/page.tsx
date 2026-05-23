"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Wrench,
  FileText,
  Calendar,
} from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RepairOrderDetailDialog } from "@/components/repair/RepairOrderDetailDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { getTodayAppointments } from "@/lib/dashboardStats";
import {
  APPOINTMENT_STATUS_LABELS,
  formatCurrency,
  formatDateTime,
  REPAIR_STATUS_LABELS,
  toDate,
} from "@/lib/utils";
import { RepairOrder } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [detailOrder, setDetailOrder] = useState<RepairOrder | null>(null);
  const {
    stats,
    repairOrders,
    appointments,
    invoices,
    payments,
    loading,
    getCustomer,
    getVehicle,
  } = useShopData();

  if (loading) return <PageLoader />;

  const recentOrders = [...repairOrders]
    .sort(
      (a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
    )
    .slice(0, 5);

  const todayAppointments = getTodayAppointments(appointments);

  const orderColumns: Column<RepairOrder>[] = [
    {
      key: "orderNumber",
      header: "RO #",
      render: (row) => (
        <span className="font-medium text-slate-900">{row.orderNumber}</span>
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
      key: "vehicle",
      header: "Vehicle",
      render: (row) => {
        const v = getVehicle(row.vehicleId);
        return v ? `${v.year} ${v.make} ${v.model}` : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant={
            row.status === "ready_for_pickup"
              ? "success"
              : row.status === "waiting_approval"
                ? "warning"
                : "info"
          }
        >
          {REPAIR_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: "mechanic",
      header: "Assigned",
      render: (row) => row.assignedMechanicName ?? "—",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        subtitle="Shop overview — manage the schedule on Appointments"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Today&apos;s appointments</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                {stats.appointmentsToday} scheduled today
              </p>
            </div>
            <Link
              href="/appointments"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open schedule
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No appointments today.{" "}
                <Link href="/appointments" className="font-medium text-blue-700 hover:underline">
                  Add one on the schedule
                </Link>
                .
              </p>
            ) : (
              todayAppointments.map((apt) => {
                const customer = getCustomer(apt.customerId);
                const vehicle = apt.vehicleId
                  ? getVehicle(apt.vehicleId)
                  : undefined;
                return (
                  <div
                    key={apt.id}
                    className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{apt.title}</p>
                      <p className="text-sm text-slate-500">
                        {customer
                          ? `${customer.firstName} ${customer.lastName}`
                          : "—"}
                      </p>
                      {vehicle && (
                        <p className="text-xs text-slate-400">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                      )}
                      <Badge variant="info" className="mt-1 text-xs">
                        {APPOINTMENT_STATUS_LABELS[apt.status]}
                      </Badge>
                    </div>
                    <p className="shrink-0 text-right text-sm text-slate-600">
                      {formatDateTime(toDate(apt.scheduledAt))}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Appointments Today"
            value={stats.appointmentsToday}
            icon={Calendar}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
          />
          <StatCard
            title="Open Repair Orders"
            value={stats.openRepairOrders}
            icon={Wrench}
          />
          <StatCard
            title="Outstanding Invoices"
            value={stats.outstandingInvoices}
            icon={FileText}
          />
        </div>

        <DashboardCharts
          payments={payments}
          invoices={invoices}
          repairOrders={repairOrders}
          appointments={appointments}
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent Repair Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={orderColumns}
              data={recentOrders}
              keyExtractor={(r) => r.id}
              onRowClick={setDetailOrder}
              emptyMessage="No repair orders yet"
            />
          </CardContent>
        </Card>
      </div>

      {detailOrder && (
        <RepairOrderDetailDialog
          order={detailOrder}
          customer={getCustomer(detailOrder.customerId)}
          vehicle={getVehicle(detailOrder.vehicleId)}
          invoice={
            invoices.find(
              (inv) =>
                inv.id === detailOrder.invoiceId ||
                inv.repairOrderId === detailOrder.id
            ) ?? undefined
          }
          shopId={user?.shopId}
          onClose={() => setDetailOrder(null)}
          onEditJobs={() => {
            setDetailOrder(null);
            router.push(`/repair-orders?ro=${detailOrder.id}`);
          }}
          onUploadFiles={() => {
            setDetailOrder(null);
            router.push(`/repair-orders?ro=${detailOrder.id}&upload=1`);
          }}
        />
      )}
    </div>
  );
}
