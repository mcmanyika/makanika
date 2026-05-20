"use client";

import { Badge } from "@/components/ui/Badge";
import { getRepairOrderJobs } from "@/lib/repairOrderJobs";
import { REPAIR_STATUS_LABELS } from "@/lib/utils";
import { RepairOrder } from "@/types";

interface RepairOrderJobsListProps {
  order: RepairOrder;
  compact?: boolean;
}

export function RepairOrderJobsList({ order, compact = false }: RepairOrderJobsListProps) {
  const jobs = getRepairOrderJobs(order);

  if (jobs.length === 1 && jobs[0].id === "legacy") {
    return (
      <p className={compact ? "text-sm text-slate-700" : "text-slate-700"}>
        {order.description}
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {jobs.map((job, index) => (
        <li
          key={job.id}
          className={
            compact
              ? "text-sm text-slate-700"
              : "rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-400">
                Job {index + 1}
              </span>
              <p className="font-medium text-slate-900">{job.description}</p>
              {job.notes && (
                <p className="mt-0.5 text-xs text-slate-500">{job.notes}</p>
              )}
              {job.assignedMechanicName && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {job.assignedMechanicName}
                </p>
              )}
            </div>
            <Badge variant="neutral" className="shrink-0 text-xs">
              {REPAIR_STATUS_LABELS[job.status]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
