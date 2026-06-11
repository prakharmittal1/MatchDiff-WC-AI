import { describe, expect, it } from "vitest";

import { GROUP_STAGE_MATCH_COUNT, loadGroupStageFixtures } from "@/lib/wc26-group-fixtures";
import type { ParsedWcGame } from "@/lib/polymarket-gamma";

describe("loadGroupStageFixtures", () => {
  it("returns all group stage rows from schedule", () => {
    const fixtures = loadGroupStageFixtures();
    expect(fixtures.length).toBe(GROUP_STAGE_MATCH_COUNT);
    expect(GROUP_STAGE_MATCH_COUNT).toBe(72);
    expect(fixtures[0]?.home).toBe("Mexico");
    expect(fixtures[0]?.competition).toMatch(/Group A/);
  });

  it("merges Polymarket odds when home/away/date match", () => {
    const poly: ParsedWcGame[] = [
      {
        home: "Mexico",
        away: "South Africa",
        kickoff_iso: "2026-06-11T19:00:00Z",
        prices: { home: 0.66, draw: 0.21, away: 0.12 },
        event_slug: "fifwc-mex-rsa-2026-06-11",
        event_id: "1",
        event_title: "Mexico vs South Africa",
      },
    ];
    const fixtures = loadGroupStageFixtures(poly);
    const opener = fixtures.find((f) => f.home === "Mexico" && f.away === "South Africa");
    expect(opener?.market_price_source).toBe("polymarket");
    expect(opener?.market_home_win).toBe(0.66);
    expect(opener?.kickoff_iso).toBe("2026-06-11T19:00:00Z");
  });
});
