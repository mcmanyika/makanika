import { RepairOrder, RepairOrderJob, RepairOrderStatus } from "@/types";

export const ALL_JOB_STATUSES: RepairOrderStatus[] = [
  "received",
  "diagnosing",
  "waiting_approval",
  "in_progress",
  "completed",
  "ready_for_pickup",
];

export function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyJob(
  status: RepairOrderStatus = "received",
  assignedMechanicName?: string
): RepairOrderJob {
  const job: RepairOrderJob = {
    id: createJobId(),
    description: "",
    status,
  };
  if (assignedMechanicName?.trim()) {
    job.assignedMechanicName = assignedMechanicName.trim();
  }
  return job;
}

export function formatJobsSummary(jobs: RepairOrderJob[]): string {
  return jobs
    .map((j) => j.description.trim())
    .filter(Boolean)
    .join("; ");
}

/** Normalize legacy repair orders that only have a single description field. */
export function getRepairOrderJobs(order: RepairOrder): RepairOrderJob[] {
  if (order.jobs && order.jobs.length > 0) {
    return order.jobs;
  }
  return [
    {
      id: "legacy",
      description: order.description,
      status: order.status,
      assignedMechanicName: order.assignedMechanicName,
    },
  ];
}

export function deriveOrderStatus(jobs: RepairOrderJob[]): RepairOrderStatus {
  const rank: Record<RepairOrderStatus, number> = {
    received: 0,
    diagnosing: 1,
    waiting_approval: 2,
    in_progress: 3,
    completed: 4,
    ready_for_pickup: 5,
  };
  let max = 0;
  let status: RepairOrderStatus = "received";
  for (const job of jobs) {
    const r = rank[job.status] ?? 0;
    if (r >= max) {
      max = r;
      status = job.status;
    }
  }
  return status;
}

/** Build a job object safe for Firestore (no undefined values). */
export function jobToFirestore(
  j: RepairOrderJob,
  fallbackStatus: RepairOrderStatus,
  defaultMechanic?: string
): RepairOrderJob {
  const base: RepairOrderJob = {
    id: j.id || createJobId(),
    description: j.description.trim(),
    status: j.status ?? fallbackStatus,
  };

  const mechanic =
    j.assignedMechanicName?.trim() || defaultMechanic?.trim() || "";
  if (mechanic) base.assignedMechanicName = mechanic;
  const notes = j.notes?.trim() || "";
  if (notes) base.notes = notes;

  return base;
}

export function sanitizeJobsForSave(
  jobs: RepairOrderJob[],
  fallbackStatus: RepairOrderStatus,
  defaultMechanic?: string
): RepairOrderJob[] {
  return jobs
    .map((j) => jobToFirestore(j, fallbackStatus, defaultMechanic))
    .filter((j) => j.description.length > 0);
}

/** Order status derived from individual job statuses. */
export function getEffectiveOrderStatus(order: RepairOrder): RepairOrderStatus {
  if (order.jobs && order.jobs.length > 0) {
    return deriveOrderStatus(order.jobs);
  }
  return order.status;
}

export function shopSelectableStatuses(): RepairOrderStatus[] {
  return ALL_JOB_STATUSES;
}
