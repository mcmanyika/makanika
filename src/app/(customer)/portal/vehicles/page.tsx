"use client";

import { useRef, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { createVehicle, updateVehicle } from "@/lib/firebase/mutations";
import {
  VehicleFormFields,
  VehicleFormValues,
  emptyVehicleForm,
  vehicleToFormValues,
  parseVehicleForm,
} from "@/components/vehicles/VehicleFormFields";
import { Vehicle } from "@/types";

export default function CustomerVehiclesPage() {
  const { user } = useAuth();
  const { vehicles, loading } = useCustomerData();
  const formRef = useRef<HTMLDivElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<VehicleFormValues>(emptyVehicleForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VehicleFormValues>(emptyVehicleForm);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const openAddForm = () => {
    setEditingId(null);
    setAddForm(emptyVehicleForm());
    setShowAddForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const startEdit = (vehicle: Vehicle) => {
    setShowAddForm(false);
    setEditingId(vehicle.id);
    setEditForm(vehicleToFormValues(vehicle));
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyVehicleForm());
    setError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId || !user?.customerId) {
      setError("Your account is missing profile data. Try signing out and back in.");
      return;
    }

    const parsed = parseVehicleForm(addForm);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setSubmitting(true);
    try {
      await createVehicle({
        shopId: user.shopId,
        customerId: user.customerId,
        ...parsed,
      });
      setSuccess("Vehicle added successfully.");
      setAddForm(emptyVehicleForm());
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not add vehicle.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent, vehicleId: string) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const parsed = parseVehicleForm(editForm);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setSubmitting(true);
    try {
      await updateVehicle(vehicleId, parsed);
      setSuccess("Vehicle updated successfully.");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update vehicle.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">My Vehicles</h1>
          <Button type="button" onClick={openAddForm} disabled={!!editingId}>
            <Plus className="h-4 w-4" />
            Add vehicle
          </Button>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {showAddForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>Add a vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <VehicleFormFields
                    values={addForm}
                    onChange={setAddForm}
                    idPrefix="add"
                  />
                  {error && !editingId && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : "Save vehicle"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => {
                        setShowAddForm(false);
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.length === 0 && !showAddForm ? (
            <p className="text-slate-500 sm:col-span-2">
              No vehicles on file.{" "}
              <button
                type="button"
                onClick={openAddForm}
                className="font-medium text-blue-600 hover:underline"
              >
                Add your first vehicle
              </button>
            </p>
          ) : (
            vehicles.map((v) => {
              const isEditing = editingId === v.id;

              return (
                <Card
                  key={v.id}
                  className={isEditing ? "ring-2 ring-blue-500" : undefined}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    {isEditing ? (
                      <CardTitle>Edit vehicle</CardTitle>
                    ) : (
                      <CardTitle>
                        {v.year} {v.make} {v.model}
                      </CardTitle>
                    )}
                    {!isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(v)}
                        disabled={showAddForm || !!editingId}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleUpdate(e, v.id)}
                        className="space-y-4"
                      >
                        <VehicleFormFields
                          values={editForm}
                          onChange={setEditForm}
                          idPrefix={`edit-${v.id}`}
                        />
                        {error && editingId === v.id && (
                          <p className="text-sm text-red-600" role="alert">
                            {error}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : "Save changes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={submitting}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-1 text-sm text-slate-600">
                        {v.trim && <p>Trim: {v.trim}</p>}
                        {v.licensePlate && <p>Plate: {v.licensePlate}</p>}
                        {v.vin && (
                          <p className="font-mono text-xs">VIN: {v.vin}</p>
                        )}
                        {v.mileage != null && (
                          <p>Mileage: {v.mileage.toLocaleString()} mi</p>
                        )}
                        {v.color && <p>Color: {v.color}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
