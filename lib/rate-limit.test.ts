import { describe, expect, it } from "vitest";

import { checkAnalyzeRateLimit } from "@/lib/rate-limit";

describe("checkAnalyzeRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const first = checkAnalyzeRateLimit(key);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.remaining).toBeGreaterThanOrEqual(0);
  });

  it("blocks after the configured maximum", () => {
    const key = `burst-${Date.now()}-${Math.random()}`;
    let allowed = 0;

    for (let i = 0; i < 30; i++) {
      const result = checkAnalyzeRateLimit(key);
      if (result.ok) allowed += 1;
      else {
        expect(result.retryAfterSec).toBeGreaterThan(0);
        break;
      }
    }

    expect(allowed).toBeGreaterThan(0);
    expect(allowed).toBeLessThanOrEqual(20);
  });
});
