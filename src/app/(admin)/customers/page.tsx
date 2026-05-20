"use client";

import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import { CustomerFiltersBar } from "@/components/customers/CustomerFiltersBar";
import type {
  CustomerActivityFilter,
  CustomerDateFilter,
  CustomerSort,
  CustomerVehicleFilter,
} from "@/components/customers/CustomerFiltersBar";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import {
  filterCustomers,
  getUniqueCustomerStates,
} from "@/lib/customerFilters";
import { createCustomer } from "@/lib/firebase/mutations";
import { Customer } from "@/types";

export default function CustomersPage() {
  const { user } = useAuth();
  const {
    customers,
    vehicles,
    repairOrders,
    invoices,
    appointments,
    loading,
  } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] =
    useState<CustomerVehicleFilter>("all");
  const [dateFilter, setDateFilter] = useState<CustomerDateFilter>("all");
  const [activityFilter, setActivityFilter] =
    useState<CustomerActivityFilter>("all");
  const [sort, setSort] = useState<CustomerSort>("name_asc");

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const uniqueStates = useMemo(
    () => getUniqueCustomerStates(customers),
    [customers]
  );

  const filteredCustomers = useMemo(
    () =>
      filterCustomers(customers, {
        search,
        stateFilter,
        vehicleFilter,
        dateFilter,
        activityFilter,
        sort,
        vehicles,
        repairOrders,
        invoices,
        appointments,
      }),
    [
      customers,
      search,
      stateFilter,
      vehicleFilter,
      dateFilter,
      activityFilter,
      sort,
      vehicles,
      repairOrders,
      invoices,
      appointments,
    ]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    stateFilter !== "all" ||
    vehicleFilter !== "all" ||
    dateFilter !== "all" ||
    activityFilter !== "all" ||
    sort !== "name_asc";

  const clearFilters = () => {
    setSearch("");
    setStateFilter("all");
    setVehicleFilter("all");
    setDateFilter("all");
    setActivityFilter("all");
    setSort("name_asc");
  };

  const selectedDetail = useMemo(() => {
    if (!selectedCustomer) return null;
    const id = selectedCustomer.id;
    return {
      vehicles: vehicles.filter((v) => v.customerId === id),
      repairOrders: repairOrders.filter((ro) => ro.customerId === id),
      invoices: invoices.filter((inv) => inv.customerId === id),
      appointments: appointments.filter((apt) => apt.customerId === id),
    };
  }, [
    selectedCustomer,
    vehicles,
    repairOrders,
    invoices,
    appointments,
  ]);

  if (loading) return <PageLoader />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured on your account.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      await createCustomer({
        shopId: user.shopId,
        firstName,
        lastName,
        email,
        phone,
        city: city || undefined,
        state: state || undefined,
      });
      setSuccess("Customer added successfully.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCity("");
      setState("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    {
      key: "city",
      header: "Location",
      render: (row) =>
        row.city && row.state ? `${row.city}, ${row.state}` : "—",
    },
    {
      key: "vehicles",
      header: "Vehicles",
      render: (row) =>
        vehicles.filter((v) => v.customerId === row.id).length,
    },
  ];

  return (
    <div>
      <AdminHeader title="Customers" subtitle="Manage customer records" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
              setTimeout(
                () => formRef.current?.scrollIntoView({ behavior: "smooth" }),
                50
              );
            }}
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <FormFeedback error={error} success={success} />

        {customers.length > 0 && (
          <CustomerFiltersBar
            search={search}
            onSearchChange={setSearch}
            stateFilter={stateFilter}
            onStateFilterChange={setStateFilter}
            states={uniqueStates}
            vehicleFilter={vehicleFilter}
            onVehicleFilterChange={setVehicleFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            activityFilter={activityFilter}
            onActivityFilterChange={setActivityFilter}
            sort={sort}
            onSortChange={setSort}
            filteredCount={filteredCustomers.length}
            totalCount={customers.length}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>Add customer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">First name *</label>
                    <input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Last name *</label>
                    <input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">City</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">State</label>
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                      placeholder="TX"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : "Save customer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filteredCustomers}
          keyExtractor={(r) => r.id}
          onRowClick={setSelectedCustomer}
          emptyMessage={
            customers.length === 0
              ? "No customers yet"
              : "No customers match your filters"
          }
        />

        {selectedCustomer && selectedDetail && (
          <CustomerDetailDialog
            customer={selectedCustomer}
            vehicles={selectedDetail.vehicles}
            repairOrders={selectedDetail.repairOrders}
            invoices={selectedDetail.invoices}
            appointments={selectedDetail.appointments}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </div>
  );
}
