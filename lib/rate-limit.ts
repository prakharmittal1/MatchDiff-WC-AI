import { envPositiveInt } from "@/lib/env";

type RateEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

const buckets = new Map<string, RateEntry>();

const WINDOW_MS = envPositiveInt("ANALYZE_RATE_LIMIT_WINDOW_MS", 60_000);
const MAX_REQUESTS = envPositiveInt("ANALYZE_RATE_LIMIT_MAX", 20);

function pruneExpired(now: number): void {
  if (buckets.size < 512) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function checkAnalyzeRateLimit(clientKey: string): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const prev = buckets.get(clientKey);
  if (!prev || prev.resetAt <= now) {
    buckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }

  if (prev.count >= MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((prev.resetAt - now) / 1000)),
    };
  }

  prev.count += 1;
  buckets.set(clientKey, prev);
  return { ok: true, remaining: MAX_REQUESTS - prev.count };
}
