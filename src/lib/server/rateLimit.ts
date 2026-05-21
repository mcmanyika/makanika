const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export function checkRateLimit(uid: string): void {
  const now = Date.now();
  const entry = buckets.get(uid);

  if (!entry || now >= entry.resetAt) {
    buckets.set(uid, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    throw new RateLimitError();
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}
