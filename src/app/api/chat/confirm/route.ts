import { NextResponse } from "next/server";
import { AuthError, verifyRequestAuth } from "@/lib/server/auth";
import {
  deletePendingAction,
  executePendingAction,
  getPendingAction,
} from "@/lib/server/pendingActions";
import { checkRateLimit, RateLimitError } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  try {
    const { uid, user } = await verifyRequestAuth(request);
    checkRateLimit(uid);

    const body = (await request.json()) as { pendingActionId?: string };
    const pendingActionId = body.pendingActionId?.trim();
    if (!pendingActionId) {
      return NextResponse.json(
        { error: "pendingActionId is required." },
        { status: 400 }
      );
    }

    const doc = await getPendingAction(pendingActionId, uid);
    if (!doc) {
      return NextResponse.json(
        { error: "This action expired or was not found. Please ask again." },
        { status: 404 }
      );
    }

    if (doc.shopId !== user.shopId) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const message = await executePendingAction(doc);
    await deletePendingAction(pendingActionId);

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/chat/confirm]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not complete action." },
      { status: 500 }
    );
  }
}
