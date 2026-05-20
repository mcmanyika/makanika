"use client";

import { Check } from "lucide-react";
import { RepairOrderStatus } from "@/types";
import {
  REPAIR_ORDER_STATUSES,
  REPAIR_STATUS_LABELS,
  getRepairStatusIndex,
  cn,
} from "@/lib/utils";

interface RepairProgressTrackerProps {
  status: RepairOrderStatus;
  compact?: boolean;
}

export function RepairProgressTracker({
  status,
  compact = false,
}: RepairProgressTrackerProps) {
  const currentIndex = getRepairStatusIndex(status);

  return (
    <div className={cn("w-full", compact ? "space-y-2" : "space-y-4")}>
      <div className="flex items-center justify-between">
        {REPAIR_ORDER_STATUSES.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step}
              className={cn(
                "flex flex-1 flex-col items-center",
                index < REPAIR_ORDER_STATUSES.length - 1 && "relative"
              )}
            >
              {index < REPAIR_ORDER_STATUSES.length - 1 && (
                <div
                  className={cn(
                    "absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                    isComplete ? "bg-blue-600" : "bg-slate-200"
                  )}
                  style={{ zIndex: 0 }}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isComplete &&
                    "border-blue-600 bg-blue-600 text-white",
                  isCurrent &&
                    "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100",
                  !isComplete &&
                    !isCurrent &&
                    "border-slate-200 bg-white text-slate-400"
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {!compact && (
                <span
                  className={cn(
                    "mt-2 hidden text-center text-xs font-medium sm:block",
                    isCurrent ? "text-blue-600" : "text-slate-500"
                  )}
                >
                  {REPAIR_STATUS_LABELS[step]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {compact && (
        <p className="text-center text-sm font-medium text-blue-600">
          {REPAIR_STATUS_LABELS[status]}
        </p>
      )}
    </div>
  );
}
