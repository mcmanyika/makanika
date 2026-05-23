"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ShopDataProvider } from "@/contexts/ShopDataContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["shop_admin", "mechanic"]}>
      <ShopDataProvider>
        <div className="min-h-screen bg-slate-50">
          <AdminSidebar />
          <main className="flex min-h-screen flex-col lg:pl-16">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </main>
        </div>
      </ShopDataProvider>
    </ProtectedRoute>
  );
}
