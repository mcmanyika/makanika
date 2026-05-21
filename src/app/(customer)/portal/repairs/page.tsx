"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RepairProgressTracker } from "@/components/ui/RepairProgressTracker";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { MediaGallery } from "@/components/repair/MediaGallery";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { RepairOrderJobsList } from "@/components/repair/RepairOrderJobsList";
import { getEffectiveOrderStatus } from "@/lib/repairOrderJobs";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { useRepairOrderMedia } from "@/hooks/useRepairOrderMedia";
import { REPAIR_STATUS_LABELS } from "@/lib/utils";
import { RepairOrder } from "@/types";

function RepairOrderCard({
  order,
  vehicleLabel,
}: {
  order: RepairOrder;
  vehicleLabel: string;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const { data: media, loading } = useRepairOrderMedia(
    user?.shopId,
    expanded ? order.id : null
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{order.orderNumber}</CardTitle>
          <p className="text-sm text-slate-500">{vehicleLabel}</p>
        </div>
        <Badge variant="info">
          {REPAIR_STATUS_LABELS[getEffectiveOrderStatus(order)]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <RepairOrderJobsList order={order} />
        <RepairProgressTracker status={getEffectiveOrderStatus(order)} compact />
        <p className="text-xs text-slate-500">
          Technician: {order.assignedMechanicName ?? "TBD"}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {expanded ? "Hide photos & documents" : "View photos & documents"}
        </button>
        {expanded && (
          <MediaGallery
            items={media}
            loading={loading}
            title="Shop uploads"
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerRepairsPage() {
  const { repairOrders, vehicles, loading } = useCustomerData();

  if (loading) return <PageLoader />;

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Active Repairs</h1>
        <p className="mt-1 text-slate-500">
          Track progress on your vehicles in the shop
        </p>
      </header>
      <div className="space-y-6 p-4 sm:p-6">
        <AssistantPanel
          title="Repair assistant"
          hint='Ask "What is the status of RO-…?" or about your active repairs.'
          defaultOpen={false}
        />
        {repairOrders.length === 0 ? (
          <p className="text-slate-500">No repair orders.</p>
        ) : (
          repairOrders.map((order) => {
            const vehicle = vehicles.find((v) => v.id === order.vehicleId);
            return (
              <RepairOrderCard
                key={order.id}
                order={order}
                vehicleLabel={
                  vehicle
                    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                    : ""
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
