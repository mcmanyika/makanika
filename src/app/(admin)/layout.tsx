"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
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
          <main className="lg:pl-16">{children}</main>
        </div>
      </ShopDataProvider>
    </ProtectedRoute>
  );
}
