"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Car,
  Wrench,
  FileCheck,
  Receipt,
  History,
  Calendar,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  sidebarAsideWidth,
  sidebarBrandPadding,
  sidebarFooterPadding,
  sidebarLabelReveal,
  sidebarNavLinkLayout,
  sidebarNavPadding,
} from "@/components/layout/sidebarReveal";

const navItems = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/vehicles", label: "My Vehicles", icon: Car },
  { href: "/portal/repairs", label: "Active Repairs", icon: Wrench },
  { href: "/portal/estimates", label: "Estimates", icon: FileCheck },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/history", label: "Service History", icon: History },
  { href: "/portal/appointments", label: "Appointments", icon: Calendar },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
];

function CustomerSidebarPanel({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white",
        sidebarAsideWidth(expanded)
      )}
    >
      <div className={cn("border-b border-slate-100 py-5", sidebarBrandPadding(expanded))}>
        <Link
          href="/portal"
          onClick={onNavigate}
          className="flex items-center overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            M
          </div>
          <div className={sidebarLabelReveal(expanded)}>
            <span className="text-lg font-bold text-slate-900">Makanika</span>
            <p className="text-xs text-slate-500">Customer Portal</p>
          </div>
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-1 py-4", sidebarNavPadding(expanded))}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/portal" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={!expanded ? label : undefined}
              className={cn(
                sidebarNavLinkLayout(expanded),
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
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
          "border-t border-slate-100",
          sidebarFooterPadding(expanded)
        )}
      >
        <p
          className={cn(
            "mb-3 truncate text-sm font-medium text-slate-900",
            sidebarLabelReveal(expanded)
          )}
        >
          {user?.displayName}
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          title={!expanded ? "Sign out" : undefined}
          className={cn(
            sidebarNavLinkLayout(expanded),
            "w-full text-slate-600 hover:bg-slate-50"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={sidebarLabelReveal(expanded)}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export function CustomerSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <div
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CustomerSidebarPanel expanded={hovered} />
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
              <CustomerSidebarPanel
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
