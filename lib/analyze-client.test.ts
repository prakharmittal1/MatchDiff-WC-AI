import { describe, expect, it } from "vitest";

import { buildAnalyzeRequestBody } from "@/lib/analyze-client";
import type { Fixture } from "@/lib/fixtures";

const fixture: Fixture = {
  id: "gs-07-2026-06-13",
  home: "Brazil",
  away: "Morocco",
  kickoff_iso: "2026-06-13T19:00:00Z",
  competition: "FIFA World Cup · Group C",
  venue: "New York / New Jersey",
  market_home_win: 0.58,
  market_draw: 0.24,
  market_away_win: 0.18,
  market_price_source: "polymarket",
  polymarket_event_slug: "brazil-morocco",
  is_world_cup: true,
};

describe("buildAnalyzeRequestBody", () => {
  it("includes Polymarket prices when source is polymarket", () => {
    const body = buildAnalyzeRequestBody(fixture);
    expect(body.p_market).toBe(0.58);
    expect(body.market_draw).toBe(0.24);
    expect(body.market_away_win).toBe(0.18);
    expect(body.polymarket_event_slug).toBe("brazil-morocco");
  });

  it("omits market prices when source is not polymarket", () => {
    const body = buildAnalyzeRequestBody({
      ...fixture,
      market_price_source: "none",
    });
    expect(body.p_market).toBeUndefined();
  });
});
