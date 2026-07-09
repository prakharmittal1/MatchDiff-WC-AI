import { describe, expect, it } from "vitest";

import {
  GROUP_STAGE_MATCH_COUNT,
  KNOCKOUT_MATCH_COUNT,
  loadWc26Fixtures,
  WC26_MATCH_COUNT,
} from "@/lib/wc26-group-fixtures";
import type { ParsedWcGame } from "@/lib/polymarket-gamma";

describe("loadWc26Fixtures", () => {
  it("returns all group stage and knockout rows from schedule", () => {
    const fixtures = loadWc26Fixtures();
    expect(fixtures.length).toBe(WC26_MATCH_COUNT);
    expect(GROUP_STAGE_MATCH_COUNT).toBe(72);
    expect(KNOCKOUT_MATCH_COUNT).toBe(32);
    expect(fixtures[0]?.home).toBe("Mexico");
    expect(fixtures[0]?.competition).toMatch(/Group A/);
    const r32 = fixtures.find((f) => f.competition.includes("Round of 32"));
    expect(r32?.competition).toBe("FIFA World Cup · Round of 32");
    const finalMatch = fixtures.find((f) => f.competition === "FIFA World Cup · Final");
    expect(finalMatch?.competition).toBe("FIFA World Cup · Final");
    const semis = fixtures.filter((f) => f.competition.includes("Semi Final"));
    expect(semis.map((f) => f.competition).sort()).toEqual([
      "FIFA World Cup · Semi Final 1",
      "FIFA World Cup · Semi Final 2",
    ]);
    const thirdPlace = fixtures.find((f) => f.competition === "FIFA World Cup · 3rd Place Match");
    expect(thirdPlace).toBeDefined();
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
    const fixtures = loadWc26Fixtures(poly);
    const opener = fixtures.find((f) => f.home === "Mexico" && f.away === "South Africa");
    expect(opener?.market_price_source).toBe("polymarket");
    expect(opener?.market_home_win).toBe(0.66);
    expect(opener?.kickoff_iso).toBe("2026-06-11T19:00:00Z");
  });
});
