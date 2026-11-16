import { describe, expect, it } from "vitest";

import { oddsFromFifaRanks } from "@/lib/fifa-rank-odds";

describe("oddsFromFifaRanks", () => {
  it("favors the better-ranked side", () => {
    const prices = oddsFromFifaRanks("Spain", "Argentina");
    expect(prices).not.toBeNull();
    expect(prices!.home + prices!.draw + prices!.away).toBeCloseTo(1, 3);
    // Spain (2) slightly ahead of Argentina (3)
    expect(prices!.home).toBeGreaterThan(prices!.away);
  });

  it("gives a clearer edge for a big ranking gap", () => {
    const close = oddsFromFifaRanks("Spain", "Argentina")!;
    const blowout = oddsFromFifaRanks("France", "Curaçao")!;
    expect(blowout.home - blowout.away).toBeGreaterThan(close.home - close.away);
  });

  it("returns null when a team has no rank", () => {
    expect(oddsFromFifaRanks("TBD", "Spain")).toBeNull();
  });
});
