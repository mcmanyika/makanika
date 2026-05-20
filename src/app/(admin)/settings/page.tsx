"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ShopSettingsForm } from "@/components/settings/ShopSettingsForm";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const { shop, loading } = useShopData();

  const canEdit = user?.role === "shop_admin";

  if (loading) return <PageLoader />;

  if (!shop) {
    return (
      <div>
        <AdminHeader title="Settings" subtitle="Shop profile" />
        <div className="p-6 text-slate-600">
          Shop profile not found. Run <code>npm run seed</code> to initialize
          data.
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminHeader title="Settings" subtitle="Shop profile" />
      <div className="max-w-2xl space-y-6 p-4 sm:p-6">
        <ShopSettingsForm shop={shop} canEdit={canEdit} />
      </div>
    </div>
  );
}
