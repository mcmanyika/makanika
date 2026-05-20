"use client";

import Link from "next/link";
import { Car, Wrench, FileCheck, Receipt } from "lucide-react";
import { RecentPaymentsCard } from "@/components/payments/RecentPaymentsCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { Card, CardContent } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatCurrency } from "@/lib/utils";

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const {
    vehicles,
    repairOrders,
    estimates,
    invoices,
    payments,
    loading,
  } = useCustomerData();

  if (loading) return <PageLoader />;

  const pendingEstimate = estimates.find(
    (e) => e.approvalStatus === "pending"
  );
  const unpaidInvoice = invoices.find((i) => i.status !== "paid");
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.displayName?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-slate-500">
          Track your repairs, estimates, and appointments
        </p>
      </header>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/portal/vehicles",
              icon: Car,
              label: "My Vehicles",
              value: vehicles.length,
            },
            {
              href: "/portal/repairs",
              icon: Wrench,
              label: "Active Repairs",
              value: repairOrders.filter((r) => r.status !== "ready_for_pickup")
                .length,
            },
            {
              href: "/portal/estimates",
              icon: FileCheck,
              label: "Pending Estimates",
              value: estimates.filter((e) => e.approvalStatus === "pending")
                .length,
            },
            {
              href: "/portal/invoices",
              icon: Receipt,
              label: "Open Invoices",
              value: invoices.filter((i) => i.status !== "paid").length,
            },
          ].map(({ href, icon: Icon, label, value }) => (
            <Link key={href} href={href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <Icon className="h-6 w-6 text-slate-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {pendingEstimate && (
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  Estimate awaiting your approval
                </p>
                <p className="text-sm text-slate-600">
                  Total: {formatCurrency(pendingEstimate.total)}
                </p>
              </div>
              <Link
                href="/portal/estimates"
                className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Review estimate
              </Link>
            </CardContent>
          </Card>
        )}

        <RecentPaymentsCard payments={payments} invoices={invoices} />

        {unpaidInvoice && (
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Invoice due</p>
                <p className="text-sm text-slate-600">
                  {unpaidInvoice.invoiceNumber} —{" "}
                  {formatCurrency(unpaidInvoice.total)}
                </p>
              </div>
              <Link
                href="/portal/invoices"
                className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Pay now
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
