"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Calendar } from "lucide-react";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { CustomerNotificationsBell } from "@/components/notifications/CustomerNotificationsBell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerDataProvider } from "@/contexts/CustomerDataContext";
import { StripeCheckoutReturn } from "@/components/payments/StripeCheckoutReturn";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <CustomerDataProvider>
        <div className="min-h-screen bg-slate-50">
          <CustomerSidebar />
          <main className="flex min-h-screen flex-col lg:pl-16">
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6 lg:px-8">
              <Link href="/portal/appointments" className="lg:hidden">
                <Button type="button" size="sm">
                  <Calendar className="h-4 w-4" />
                  Book
                </Button>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Link href="/portal/appointments" className="hidden lg:block">
                  <Button type="button" size="sm" variant="outline">
                    <Calendar className="h-4 w-4" />
                    Appointments
                  </Button>
                </Link>
                <CustomerNotificationsBell />
              </div>
            </div>
            <Suspense fallback={null}>
              <StripeCheckoutReturn />
            </Suspense>
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </main>
        </div>
      </CustomerDataProvider>
    </ProtectedRoute>
  );
}
