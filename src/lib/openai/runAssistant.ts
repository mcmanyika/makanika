import OpenAI from "openai";
import { buildSystemContext } from "@/lib/server/chatContext";
import { runTool, toolsForUser } from "@/lib/openai/tools";
import type { ChatMessageInput } from "@/lib/openai/types";
import { User } from "@/types";

const MAX_TOOL_ROUNDS = 5;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new OpenAIConfigError();
  }
  return new OpenAI({ apiKey });
}

export class OpenAIConfigError extends Error {
  constructor() {
    super(
      "OpenAI is not configured. Set OPENAI_API_KEY in .env.local (local) or your hosting environment variables (production)."
    );
    this.name = "OpenAIConfigError";
  }
}

export interface RunAssistantResult {
  message: string;
  pendingAction?: {
    id: string;
    summary: string;
    action: "book_appointment" | "reschedule_appointment";
  };
}

export async function runAssistant(
  user: User,
  uid: string,
  messages: ChatMessageInput[]
): Promise<RunAssistantResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const context = await buildSystemContext(user);

  const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: "system",
    content: `You are Makanika Shop Assistant — helpful, concise, professional. You help with appointments, repair order status, and scheduling.

Rules:
- Use tools for real data; never invent appointment times or repair statuses.
- For booking or rescheduling, always use book_appointment or reschedule_appointment tools; tell the user to tap Confirm when a proposal is ready.
- Suggest available slots before booking when the user has not picked a specific time.
- Shop staff must provide or look up customerId before booking for a customer.

Context:
${context}`,
  };

  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    systemMessage,
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  let pendingAction: RunAssistantResult["pendingAction"];
  const tools = toolsForUser(user);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model,
      messages: conversation,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : undefined,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) {
      return { message: "I could not generate a response. Please try again." };
    }

    if (choice.tool_calls?.length) {
      conversation.push(choice);

      for (const tc of choice.tool_calls) {
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }

        const result = await runTool(tc.function.name, args, user, uid);
        if (result.pendingActionId && result.pendingSummary && result.pendingActionType) {
          pendingAction = {
            id: result.pendingActionId,
            summary: result.pendingSummary,
            action: result.pendingActionType,
          };
        }

        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result.content,
        });
      }
      continue;
    }

    const text = choice.content?.trim();
    return {
      message: text || "How can I help you today?",
      pendingAction,
    };
  }

  return {
    message:
      "I need a bit more information. What would you like to book or check?",
    pendingAction,
  };
}
