"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { updateUserRole } from "@/lib/firebase/mutations";
import { USER_ROLE_LABELS } from "@/lib/utils";
import { User, UserRole } from "@/types";

const STAFF_ROLES: UserRole[] = ["shop_admin", "mechanic"];

function roleBadgeVariant(
  role: UserRole
): "success" | "info" | "warning" | "neutral" {
  if (role === "shop_admin") return "success";
  if (role === "mechanic") return "info";
  return "neutral";
}

function roleOptionsForUser(user: User): UserRole[] {
  if (user.customerId) {
    return ["shop_admin", "mechanic", "customer"];
  }
  return STAFF_ROLES;
}

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { users, customers, loading } = useShopData();
  const [roleOverrides, setRoleOverrides] = useState<Record<string, UserRole>>(
    {}
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = currentUser?.role === "shop_admin";

  useEffect(() => {
    if (!loading && currentUser && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, currentUser, isAdmin, router]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const roleOrder: Record<UserRole, number> = {
          shop_admin: 0,
          mechanic: 1,
          customer: 2,
        };
        const rd = roleOrder[a.role] - roleOrder[b.role];
        if (rd !== 0) return rd;
        return a.displayName.localeCompare(b.displayName);
      }),
    [users]
  );

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return null;
    const c = customers.find((x) => x.id === customerId);
    return c ? `${c.firstName} ${c.lastName}` : null;
  };

  const handleRoleChange = async (target: User, nextRole: UserRole) => {
    if (!currentUser || target.role === nextRole) return;

    setSavingId(target.id);
    setError("");
    setSuccess("");

    try {
      await updateUserRole(target.id, nextRole, currentUser.id);
      setRoleOverrides((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      setSuccess(`Updated role for ${target.displayName}.`);
    } catch (err) {
      setRoleOverrides((prev) => ({ ...prev, [target.id]: target.role }));
      setError(
        err instanceof Error ? err.message : "Failed to update user role."
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading || !isAdmin) return <PageLoader />;

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.displayName}</p>
          {row.id === currentUser?.id && (
            <span className="text-xs text-slate-500">(you)</span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-slate-600">{row.email}</span>,
    },
    {
      key: "linked",
      header: "Customer record",
      render: (row) => {
        const name = getCustomerName(row.customerId);
        return name ? (
          <span className="text-slate-600">{name}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      render: (row) => {
        const effectiveRole = roleOverrides[row.id] ?? row.role;
        const isSelf = row.id === currentUser?.id;
        const isSaving = savingId === row.id;

        if (isSelf) {
          return (
            <Badge variant={roleBadgeVariant(row.role)}>
              {USER_ROLE_LABELS[row.role]}
            </Badge>
          );
        }

        return (
          <select
            value={effectiveRole}
            disabled={isSaving}
            onChange={(e) => {
              const next = e.target.value as UserRole;
              setRoleOverrides((prev) => ({ ...prev, [row.id]: next }));
              void handleRoleChange(row, next);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
            aria-label={`Role for ${row.displayName}`}
          >
            {roleOptionsForUser(row).map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        savingId === row.id ? (
          <span className="text-xs text-slate-500">Saving…</span>
        ) : (
          <Badge variant={roleBadgeVariant(row.role)} className="text-xs">
            {USER_ROLE_LABELS[row.role]}
          </Badge>
        ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Users"
        subtitle="Manage shop staff and portal access roles"
      />
      <div className="space-y-4 p-4 sm:p-6">
        <FormFeedback error={error} success={success} />

        <Card>
          <CardHeader>
            <CardTitle>All users ({sortedUsers.length})</CardTitle>
            <p className="text-sm text-slate-500">
              Shop admins and mechanics can use the admin app. Customers with a
              linked profile can use the customer portal. You cannot change your
              own role.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={sortedUsers}
              keyExtractor={(u) => u.id}
              emptyMessage="No users found for this shop."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
