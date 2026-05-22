import OpenAI from "openai";
import { buildSystemContext } from "@/lib/server/chatContext";
import {
  buildAssistantSystemPrompt,
  buildPendingConfirmMessage,
  sanitizeAssistantReply,
} from "@/lib/openai/systemPrompt";
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
  const nowIso = new Date().toISOString();

  const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: "system",
    content: buildAssistantSystemPrompt(context, nowIso),
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
      temperature: 0.2,
      parallel_tool_calls: false,
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

    if (pendingAction) {
      return {
        message: buildPendingConfirmMessage(pendingAction.summary),
        pendingAction,
      };
    }

    const text = sanitizeAssistantReply(
      choice.content?.trim() || "How can I help you today?",
      false
    );
    return { message: text, pendingAction };
  }

  if (pendingAction) {
    return {
      message: buildPendingConfirmMessage(pendingAction.summary),
      pendingAction,
    };
  }

  return {
    message:
      "I need a bit more information. What would you like to book or check?",
    pendingAction,
  };
}
