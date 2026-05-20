"use client";

import { Suspense } from "react";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
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
          <main className="lg:pl-16">
            <div className="sticky top-0 z-30 flex items-center justify-end border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6 lg:px-8">
              <CustomerNotificationsBell />
            </div>
            <Suspense fallback={null}>
              <StripeCheckoutReturn />
            </Suspense>
            {children}
          </main>
        </div>
      </CustomerDataProvider>
    </ProtectedRoute>
  );
}
