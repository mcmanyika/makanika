import OpenAI from "openai";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getEffectiveOrderStatus } from "@/lib/repairOrderJobs";
import {
  findCustomerByName,
  getAppointmentById,
  listAppointmentsForCustomer,
  listAppointmentsForShop,
  suggestAvailableSlots,
} from "@/lib/server/appointmentService";
import { getRepairOrderSummary } from "@/lib/server/chatContext";
import { isShopStaff } from "@/lib/server/auth";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import {
  formatPendingSummary,
  savePendingAction,
  type BookAppointmentPayload,
  type RescheduleAppointmentPayload,
} from "@/lib/server/pendingActions";
import { formatDateTime, REPAIR_STATUS_LABELS, toDate } from "@/lib/utils";
import { Appointment, RepairOrder, User } from "@/types";

function appointmentWhen(a: Appointment): Date {
  return toDate(a.scheduledAt as Date | string);
}

export const ASSISTANT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_my_appointments",
      description: "List the current user's upcoming and recent appointments.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_shop_appointments",
      description: "List shop appointments (staff only). Optional days ahead.",
      parameters: {
        type: "object",
        properties: {
          daysAhead: { type: "number", description: "Days to look ahead, default 14" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_available_slots",
      description: "Find open appointment slots. Use before booking.",
      parameters: {
        type: "object",
        properties: {
          daysAhead: { type: "number", description: "Days to search, default 7" },
          durationMinutes: { type: "number", description: "Appointment length, default 60" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_repair_orders",
      description: "List the customer's active repair orders and statuses.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_repair_order_status",
      description: "Get status for a repair order by RO number or ID.",
      parameters: {
        type: "object",
        properties: {
          orderNumberOrId: { type: "string", description: "RO number e.g. RO-2026-0142 or document id" },
        },
        required: ["orderNumberOrId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_customer_by_name",
      description: "Find customers by name or email (staff only).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Propose booking an appointment. Does NOT confirm until user approves. Requires customerId for staff bookings.",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          title: { type: "string" },
          scheduledAt: { type: "string", description: "ISO 8601 datetime" },
          durationMinutes: { type: "number" },
          vehicleId: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "scheduledAt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_appointment",
      description: "Propose rescheduling an existing appointment. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "string" },
          title: { type: "string" },
          scheduledAt: { type: "string", description: "ISO 8601 datetime" },
          durationMinutes: { type: "number" },
          vehicleId: { type: "string" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
          },
        },
        required: ["appointmentId", "scheduledAt"],
        additionalProperties: false,
      },
    },
  },
];

function toolsForUser(user: User): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const staff = isShopStaff(user.role);
  return ASSISTANT_TOOLS.filter((t) => {
    const name = t.function?.name;
    if (name === "list_shop_appointments" || name === "find_customer_by_name") {
      return staff;
    }
    if (name === "list_my_appointments" || name === "list_my_repair_orders") {
      return user.role === "customer";
    }
    return true;
  });
}

export { toolsForUser };

export interface ToolRunResult {
  content: string;
  pendingActionId?: string;
  pendingSummary?: string;
  pendingActionType?: "book_appointment" | "reschedule_appointment";
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  user: User,
  uid: string
): Promise<ToolRunResult> {
  const shopId = user.shopId!;

  switch (name) {
    case "list_my_appointments": {
      if (!user.customerId) {
        return { content: "No customer profile linked to this account." };
      }
      const list = await listAppointmentsForCustomer(shopId, user.customerId);
      const now = new Date();
      const lines = list
        .sort(
          (a, b) => appointmentWhen(a).getTime() - appointmentWhen(b).getTime()
        )
        .slice(0, 15)
        .map((a) => {
          const when = appointmentWhen(a);
          const tag = when < now ? "past" : "upcoming";
          return `${a.id}: ${a.title} — ${formatDateTime(when)} (${a.status}, ${tag})`;
        });
      return {
        content: lines.length ? lines.join("\n") : "No appointments found.",
      };
    }

    case "list_shop_appointments": {
      const daysAhead = Number(args.daysAhead) || 14;
      const list = await listAppointmentsForShop(shopId);
      const end = new Date();
      end.setDate(end.getDate() + daysAhead);
      const lines = list
        .filter((a) => {
          const when = appointmentWhen(a);
          return when <= end && a.status !== "cancelled";
        })
        .slice(0, 20)
        .map(
          (a) =>
            `${a.id}: ${a.title} — ${formatDateTime(appointmentWhen(a))} (customer ${a.customerId}, ${a.status})`
        );
      return {
        content: lines.length ? lines.join("\n") : "No appointments in range.",
      };
    }

    case "suggest_available_slots": {
      const daysAhead = Number(args.daysAhead) || 7;
      const durationMinutes = Number(args.durationMinutes) || 60;
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + daysAhead);
      const slots = await suggestAvailableSlots(shopId, {
        from,
        to,
        durationMinutes,
        maxResults: 10,
      });
      return {
        content: slots.length
          ? slots.map((s) => `${s.label} (${s.scheduledAt})`).join("\n")
          : "No open slots found in that range. Try different days or shorter duration.",
      };
    }

    case "list_my_repair_orders": {
      if (!user.customerId) {
        return { content: "No customer profile linked." };
      }
      const snap = await getAdminFirestore()
        .collection(COLLECTIONS.repairOrders)
        .where("shopId", "==", shopId)
        .where("customerId", "==", user.customerId)
        .get();
      const lines = snap.docs.map((d) => {
        const data = d.data();
        const order: RepairOrder = {
          id: d.id,
          shopId,
          customerId: user.customerId!,
          vehicleId: String(data.vehicleId),
          orderNumber: String(data.orderNumber),
          status: data.status as RepairOrder["status"],
          description: String(data.description ?? ""),
          jobs: data.jobs as RepairOrder["jobs"],
          mediaIds: [],
          receivedAt: data.receivedAt?.toDate?.() ?? new Date(),
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        };
        const status = REPAIR_STATUS_LABELS[getEffectiveOrderStatus(order)];
        return `${data.orderNumber}: ${status}`;
      });
      return {
        content: lines.length ? lines.join("\n") : "No repair orders found.",
      };
    }

    case "get_repair_order_status": {
      const orderNumberOrId = String(args.orderNumberOrId ?? "");
      const summary = await getRepairOrderSummary(
        shopId,
        orderNumberOrId,
        user.role === "customer" ? user.customerId : undefined
      );
      return {
        content: summary ?? `No repair order found for "${orderNumberOrId}".`,
      };
    }

    case "find_customer_by_name": {
      if (!isShopStaff(user.role)) {
        return { content: "Not authorized." };
      }
      const customers = await findCustomerByName(shopId, String(args.query ?? ""));
      return {
        content: customers.length
          ? customers
              .map((c) => `${c.id}: ${c.firstName} ${c.lastName} (${c.email})`)
              .join("\n")
          : "No matching customers.",
      };
    }

    case "book_appointment": {
      const customerId =
        (args.customerId as string) ||
        (user.role === "customer" ? user.customerId : undefined);
      if (!customerId) {
        return {
          content:
            "customerId is required. Use find_customer_by_name for staff, or book for the logged-in customer.",
        };
      }
      const payload: BookAppointmentPayload = {
        customerId,
        title: String(args.title ?? "Service appointment"),
        scheduledAt: String(args.scheduledAt),
        durationMinutes: args.durationMinutes as number | undefined,
        vehicleId: args.vehicleId as string | undefined,
        description: args.description as string | undefined,
      };
      const when = new Date(payload.scheduledAt);
      if (Number.isNaN(when.getTime()) || when < new Date()) {
        return { content: "Invalid or past scheduledAt. Use suggest_available_slots." };
      }
      const summary = formatPendingSummary("book_appointment", payload);
      const id = await savePendingAction(
        uid,
        shopId,
        "book_appointment",
        payload,
        summary
      );
      return {
        content: `Proposed booking ready for customer confirmation: ${summary}. Tell the user to tap Confirm to book.`,
        pendingActionId: id,
        pendingSummary: summary,
        pendingActionType: "book_appointment",
      };
    }

    case "reschedule_appointment": {
      const appointmentId = String(args.appointmentId ?? "");
      const existing = await getAppointmentById(appointmentId, shopId);
      if (!existing) {
        return { content: "Appointment not found." };
      }
      if (
        user.role === "customer" &&
        user.customerId &&
        existing.customerId !== user.customerId
      ) {
        return { content: "You can only reschedule your own appointments." };
      }
      const payload: RescheduleAppointmentPayload = {
        appointmentId,
        customerId: existing.customerId,
        title: String(args.title ?? existing.title),
        scheduledAt: String(args.scheduledAt),
        durationMinutes:
          (args.durationMinutes as number | undefined) ?? existing.durationMinutes,
        vehicleId: (args.vehicleId as string | undefined) ?? existing.vehicleId,
        description:
          (args.description as string | undefined) ?? existing.description,
        status: (args.status as RescheduleAppointmentPayload["status"]) ?? existing.status,
      };
      const summary = formatPendingSummary("reschedule_appointment", payload);
      const id = await savePendingAction(
        uid,
        shopId,
        "reschedule_appointment",
        payload,
        summary
      );
      return {
        content: `Proposed reschedule ready: ${summary}. User must Confirm.`,
        pendingActionId: id,
        pendingSummary: summary,
        pendingActionType: "reschedule_appointment",
      };
    }

    default:
      return { content: `Unknown tool: ${name}` };
  }
}
