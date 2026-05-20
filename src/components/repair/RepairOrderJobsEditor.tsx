"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createEmptyJob,
  shopSelectableStatuses,
} from "@/lib/repairOrderJobs";
import { REPAIR_STATUS_LABELS } from "@/lib/utils";
import { RepairOrderJob, RepairOrderStatus } from "@/types";

interface RepairOrderJobsEditorProps {
  jobs: RepairOrderJob[];
  onChange: (jobs: RepairOrderJob[]) => void;
  defaultStatus?: RepairOrderStatus;
  defaultMechanic?: string;
  disabled?: boolean;
}

export function RepairOrderJobsEditor({
  jobs,
  onChange,
  defaultStatus = "received",
  defaultMechanic,
  disabled = false,
}: RepairOrderJobsEditorProps) {
  const updateJob = (index: number, patch: Partial<RepairOrderJob>) => {
    onChange(
      jobs.map((j, i) => (i === index ? { ...j, ...patch } : j))
    );
  };

  const removeJob = (index: number) => {
    if (jobs.length <= 1) return;
    onChange(jobs.filter((_, i) => i !== index));
  };

  const addJob = () => {
    onChange([...jobs, createEmptyJob(defaultStatus, defaultMechanic)]);
  };

  const statusOptions = shopSelectableStatuses();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Jobs on this card *
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addJob}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
          Add job
        </Button>
      </div>

      {jobs.map((job, index) => (
        <div
          key={job.id}
          className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Job {index + 1}
            </span>
            {jobs.length > 1 && (
              <button
                type="button"
                onClick={() => removeJob(index)}
                disabled={disabled}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove job ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Work description *
              </label>
              <input
                required
                value={job.description}
                onChange={(e) =>
                  updateJob(index, { description: e.target.value })
                }
                disabled={disabled}
                placeholder="e.g. Oil change, brake inspection"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Assigned mechanic
                </label>
                <input
                  value={job.assignedMechanicName ?? ""}
                  onChange={(e) =>
                    updateJob(index, {
                      assignedMechanicName: e.target.value || undefined,
                    })
                  }
                  disabled={disabled}
                  placeholder={defaultMechanic || "Unassigned"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Job status
                </label>
                <select
                  value={job.status}
                  onChange={(e) =>
                    updateJob(index, {
                      status: e.target.value as RepairOrderStatus,
                    })
                  }
                  disabled={disabled}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {REPAIR_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Notes (optional)
              </label>
              <input
                value={job.notes ?? ""}
                onChange={(e) =>
                  updateJob(index, {
                    notes: e.target.value || undefined,
                  })
                }
                disabled={disabled}
                placeholder="Parts ordered, waiting on customer, etc."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
