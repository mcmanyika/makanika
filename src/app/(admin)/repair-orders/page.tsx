"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { RepairProgressTracker } from "@/components/ui/RepairProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/PageLoader";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { MediaGallery } from "@/components/repair/MediaGallery";
import { RepairOrderJobsEditor } from "@/components/repair/RepairOrderJobsEditor";
import { RepairOrderJobsList } from "@/components/repair/RepairOrderJobsList";
import { RepairOrderDetailDialog } from "@/components/repair/RepairOrderDetailDialog";
import { RepairOrderUploader } from "@/components/repair/RepairOrderUploader";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { useRepairOrderMedia } from "@/hooks/useRepairOrderMedia";
import { createRepairOrder, updateRepairOrder } from "@/lib/firebase/mutations";
import {
  createEmptyJob,
  formatJobsSummary,
  getEffectiveOrderStatus,
  getRepairOrderJobs,
} from "@/lib/repairOrderJobs";
import { REPAIR_STATUS_LABELS, REPAIR_ORDER_STATUSES } from "@/lib/utils";
import { RepairOrder, RepairOrderJob, RepairOrderStatus } from "@/types";

export default function RepairOrdersPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    repairOrders,
    customers,
    vehicles,
    invoices,
    getCustomer,
    getVehicle,
    loading,
  } = useShopData();
  const formRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const jobsEditRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [jobs, setJobs] = useState<RepairOrderJob[]>([createEmptyJob()]);
  const [editJobs, setEditJobs] = useState<RepairOrderJob[]>([]);
  const [customerConcerns, setCustomerConcerns] = useState("");
  const [mechanicName, setMechanicName] = useState("");
  const [status, setStatus] = useState<RepairOrderStatus>("waiting_approval");
  const [submitting, setSubmitting] = useState(false);
  const [savingJobs, setSavingJobs] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailOrder, setDetailOrder] = useState<RepairOrder | null>(null);

  const selectedOrder = repairOrders.find((r) => r.id === selectedId) ?? null;
  const { data: media, loading: mediaLoading } = useRepairOrderMedia(
    user?.shopId,
    selectedId
  );

  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);

  useEffect(() => {
    if (selectedOrder) {
      setEditJobs(
        getRepairOrderJobs(selectedOrder).map((j) =>
          j.id === "legacy" ? { ...j, id: createEmptyJob().id } : { ...j }
        )
      );
    } else {
      setEditJobs([]);
    }
  }, [selectedOrder?.id, selectedOrder?.updatedAt]);

  useEffect(() => {
    if (loading) return;
    const roId = searchParams.get("ro");
    if (!roId) return;
    const order = repairOrders.find((r) => r.id === roId);
    if (!order) return;

    setSelectedId(roId);
    setShowUpload(true);

    const scrollToUpload = searchParams.get("upload") === "1";
    setTimeout(() => {
      (scrollToUpload ? uploadRef : jobsEditRef).current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [loading, searchParams, repairOrders]);

  if (loading) return <PageLoader />;

  const openDetail = (order: RepairOrder) => {
    setDetailOrder(order);
    setError("");
  };

  const openManage = (order: RepairOrder) => {
    setDetailOrder(null);
    setSelectedId(order.id);
    setShowUpload(true);
    setError("");
    setTimeout(() => jobsEditRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const openUploadFromDetail = (order: RepairOrder) => {
    setDetailOrder(null);
    setSelectedId(order.id);
    setShowUpload(true);
    setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const resetCreateForm = () => {
    setCustomerId("");
    setVehicleId("");
    setJobs([createEmptyJob("waiting_approval")]);
    setCustomerConcerns("");
    setMechanicName("");
    setStatus("received");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.shopId) {
      setError("Shop not configured.");
      return;
    }
    if (!customerId || !vehicleId) {
      setError("Customer and vehicle are required.");
      return;
    }
    const validJobs = jobs.filter((j) => j.description.trim());
    if (validJobs.length === 0) {
      setError("Add at least one job with a description.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await createRepairOrder({
        shopId: user.shopId,
        customerId,
        vehicleId,
        jobs: validJobs.map((j) => ({
          id: j.id,
          description: j.description,
          status: j.status,
          assignedMechanicName: j.assignedMechanicName ?? mechanicName,
          notes: j.notes,
        })),
        customerConcerns: customerConcerns || undefined,
        assignedMechanicName: mechanicName || undefined,
        status,
      });
      setSuccess("Repair order created.");
      resetCreateForm();
      setShowForm(false);
      setSelectedId(id);
      setShowUpload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setError("");
    setSuccess("");
    const validJobs = editJobs.filter((j) => j.description.trim());
    if (validJobs.length === 0) {
      setError("At least one job is required.");
      return;
    }

    setSavingJobs(true);
    try {
      await updateRepairOrder(selectedOrder.id, {
        jobs: validJobs.map((j) => ({
          id: j.id,
          description: j.description,
          status: j.status,
          assignedMechanicName: j.assignedMechanicName,
          notes: j.notes,
        })),
      });
      setSuccess(`Jobs updated for ${selectedOrder.orderNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save jobs.");
    } finally {
      setSavingJobs(false);
    }
  };

  const columns: Column<RepairOrder>[] = [
    {
      key: "orderNumber",
      header: "RO #",
      render: (row) => (
        <span className="font-medium text-blue-600">{row.orderNumber}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => {
        const c = getCustomer(row.customerId);
        return c ? `${c.firstName} ${c.lastName}` : "—";
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (row) => {
        const v = getVehicle(row.vehicleId);
        return v ? `${v.year} ${v.make} ${v.model}` : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="info">{REPAIR_STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      key: "jobs",
      header: "Jobs",
      render: (row) => {
        const count = getRepairOrderJobs(row).length;
        return (
          <span className="text-slate-600" title={formatJobsSummary(getRepairOrderJobs(row))}>
            {count} {count === 1 ? "job" : "jobs"}
          </span>
        );
      },
    },
    {
      key: "files",
      header: "Files",
      render: (row) => (
        <span className="text-slate-600">{row.mediaIds?.length ?? 0}</span>
      ),
    },
    {
      key: "mechanic",
      header: "Mechanic",
      render: (row) => row.assignedMechanicName ?? "Unassigned",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Repair Orders"
        subtitle="Job cards, uploads, and work-in-progress tracking"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (repairOrders.length === 0) {
                setError("Create a repair order first, then upload files.");
                return;
              }
              if (!selectedId && repairOrders[0]) {
                setSelectedId(repairOrders[0].id);
              }
              setShowUpload(true);
              setError("");
              setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Upload className="h-4 w-4" />
            Upload files
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
              setJobs([createEmptyJob(status, mechanicName)]);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Plus className="h-4 w-4" />
            New Repair Order
          </Button>
        </div>

        <FormFeedback error={error} success={success} />

        {showForm && (
          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>New repair order</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Customer *</label>
                      <select
                        required
                        value={customerId}
                        onChange={(e) => {
                          setCustomerId(e.target.value);
                          setVehicleId("");
                        }}
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
                    <div>
                      <label className="mb-1 block text-sm font-medium">Vehicle *</label>
                      <select
                        required
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        disabled={!customerId}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">Select vehicle</option>
                        {customerVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.year} {v.make} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <RepairOrderJobsEditor
                    jobs={jobs}
                    onChange={setJobs}
                    defaultStatus={status}
                    defaultMechanic={mechanicName}
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium">Customer concerns</label>
                    <textarea
                      value={customerConcerns}
                      onChange={(e) => setCustomerConcerns(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Default mechanic
                      </label>
                      <input
                        value={mechanicName}
                        onChange={(e) => setMechanicName(e.target.value)}
                        placeholder="Applied to new jobs"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Card status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as RepairOrderStatus)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {REPAIR_ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {REPAIR_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        Overall status is derived from individual job statuses when saved.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Creating..." : "Create order"}
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

        {selectedOrder && (
          <div ref={jobsEditRef}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedOrder.orderNumber} — Jobs on card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveJobs} className="space-y-4">
                  <RepairOrderJobsEditor
                    jobs={editJobs}
                    onChange={setEditJobs}
                    defaultStatus={selectedOrder.status}
                    defaultMechanic={selectedOrder.assignedMechanicName}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingJobs}>
                      {savingJobs ? "Saving..." : "Save jobs"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {showUpload && (
          <div ref={uploadRef}>
            <Card>
              <CardHeader>
                <CardTitle>Upload repair order files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Repair order *</label>
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(e.target.value || null)}
                    className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select repair order</option>
                    {repairOrders.map((ro) => (
                      <option key={ro.id} value={ro.id}>
                        {ro.orderNumber} — {ro.description.slice(0, 50)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Or click a row in the table below to select an order.
                  </p>
                </div>

                {selectedOrder && (
                  <RepairOrderJobsList order={selectedOrder} />
                )}

                {selectedOrder && user?.shopId && user.id ? (
                  <>
                    <RepairOrderUploader
                      shopId={user.shopId}
                      customerId={selectedOrder.customerId}
                      repairOrderId={selectedOrder.id}
                      uploadedBy={user.id}
                      orderLabel={selectedOrder.orderNumber}
                    />
                    <MediaGallery
                      items={media}
                      loading={mediaLoading}
                      title={`Files for ${selectedOrder.orderNumber}`}
                    />
                    <RepairProgressTracker
                      status={getEffectiveOrderStatus(selectedOrder)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a repair order to upload photos, videos, or PDF job cards.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DataTable
          columns={columns}
          data={repairOrders}
          keyExtractor={(r) => r.id}
          onRowClick={openDetail}
          emptyMessage="No repair orders yet"
        />

        {detailOrder && (
          <RepairOrderDetailDialog
            order={detailOrder}
            customer={getCustomer(detailOrder.customerId)}
            vehicle={getVehicle(detailOrder.vehicleId)}
            invoice={
              invoices.find(
                (inv) =>
                  inv.id === detailOrder.invoiceId ||
                  inv.repairOrderId === detailOrder.id
              ) ?? undefined
            }
            shopId={user?.shopId}
            onClose={() => setDetailOrder(null)}
            onEditJobs={() => openManage(detailOrder)}
            onUploadFiles={() => openUploadFromDetail(detailOrder)}
          />
        )}
      </div>
    </div>
  );
}
