"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  FileText,
  FileCheck,
  Calendar,
  MessageSquare,
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { cn } from "@/lib/utils";
import {
  sidebarAsideWidth,
  sidebarBrandPadding,
  sidebarFooterPadding,
  sidebarLabelReveal,
  sidebarNavLinkLayout,
  sidebarNavPadding,
} from "@/components/layout/sidebarReveal";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}[] = [
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/repair-orders", label: "Repair Orders", icon: Wrench },
  { href: "/estimates", label: "Estimates", icon: FileCheck },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/users", label: "Users", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function AdminSidebarPanel({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { shop } = useShopData();

  const shopName = shop?.name ?? "Your Shop";

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-slate-200 bg-slate-900 text-white",
        sidebarAsideWidth(expanded)
      )}
    >
      <div className={cn("border-b border-slate-700 py-5", sidebarBrandPadding(expanded))}>
        <Link
          href="/appointments"
          onClick={onNavigate}
          className="flex items-center overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold">
            M
          </div>
          <div className={sidebarLabelReveal(expanded)}>
            <span className="text-lg font-bold tracking-tight">Makanika</span>
            <p className="truncate text-xs text-slate-400">{shopName}</p>
          </div>
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-1 py-4", sidebarNavPadding(expanded))}>
        {navItems
          .filter((item) => !item.adminOnly || user?.role === "shop_admin")
          .map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={!expanded ? label : undefined}
                className={cn(
                  sidebarNavLinkLayout(expanded),
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={sidebarLabelReveal(expanded)}>{label}</span>
              </Link>
            );
          })}
      </nav>

      <div
        className={cn(
          "border-t border-slate-700",
          sidebarFooterPadding(expanded)
        )}
      >
        <div className={cn("mb-3 truncate", sidebarLabelReveal(expanded))}>
          <p className="text-sm font-medium">{user?.displayName}</p>
          <p className="text-xs capitalize text-slate-400">
            {user?.role?.replace("_", " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          title={!expanded ? "Sign out" : undefined}
          className={cn(
            sidebarNavLinkLayout(expanded),
            "w-full text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={sidebarLabelReveal(expanded)}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg bg-slate-900 p-2 text-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex",
          hovered && "lg:z-50"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AdminSidebarPanel expanded={hovered} />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="fixed inset-y-0 left-0 z-50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <AdminSidebarPanel
                expanded
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
