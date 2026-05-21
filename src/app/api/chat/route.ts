import { NextResponse } from "next/server";
import { AuthError, verifyRequestAuth } from "@/lib/server/auth";
import { checkRateLimit, RateLimitError } from "@/lib/server/rateLimit";
import { runAssistant, OpenAIConfigError } from "@/lib/openai/runAssistant";
import type { ChatMessageInput } from "@/lib/openai/types";

export async function POST(request: Request) {
  try {
    const { uid, user } = await verifyRequestAuth(request);
    checkRateLimit(uid);

    const body = (await request.json()) as { messages?: ChatMessageInput[] };
    const messages = body.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required." },
        { status: 400 }
      );
    }

    const trimmed = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 4000),
      }));

    const result = await runAssistant(user, uid, trimmed);

    return NextResponse.json({
      message: result.message,
      pendingAction: result.pendingAction,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof OpenAIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[api/chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat request failed." },
      { status: 500 }
    );
  }
}
