"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import {
  VehicleFormFields,
  VehicleFormValues,
  emptyVehicleForm,
  parseVehicleForm,
} from "@/components/vehicles/VehicleFormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { createVehicle } from "@/lib/firebase/mutations";
import { Vehicle } from "@/types";

export default function VehiclesPage() {
  const { user } = useAuth();
  const { vehicles, customers, getCustomer, loading } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState<VehicleFormValues>(emptyVehicleForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (loading) return <PageLoader />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured.");
      return;
    }
    if (!customerId) {
      setError("Select a customer.");
      return;
    }

    const parsed = parseVehicleForm(form);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setSubmitting(true);
    try {
      await createVehicle({
        shopId: user.shopId,
        customerId,
        ...parsed,
      });
      setSuccess("Vehicle added.");
      setForm(emptyVehicleForm());
      setCustomerId("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add vehicle.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      render: (row) => (
        <span className="font-medium">
          {row.year} {row.make} {row.model}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Owner",
      render: (row) => {
        const c = getCustomer(row.customerId);
        return c ? `${c.firstName} ${c.lastName}` : "—";
      },
    },
    {
      key: "licensePlate",
      header: "Plate",
      render: (row) => row.licensePlate ?? "—",
    },
    { key: "vin", header: "VIN", render: (row) => row.vin ?? "—" },
    {
      key: "mileage",
      header: "Mileage",
      render: (row) =>
        row.mileage ? row.mileage.toLocaleString() + " mi" : "—",
    },
  ];

  return (
    <div>
      <AdminHeader title="Vehicles" subtitle="Fleet registered at your shop" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        <FormFeedback error={error} success={success} />

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>Add vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Customer *
                    </label>
                    <select
                      required
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <VehicleFormFields
                    values={form}
                    onChange={setForm}
                    idPrefix="admin-vehicle"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : "Save vehicle"}
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
          data={vehicles}
          keyExtractor={(r) => r.id}
          emptyMessage="No vehicles yet"
        />
      </div>
    </div>
  );
}
