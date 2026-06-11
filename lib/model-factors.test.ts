import { describe, expect, it } from "vitest";

import {
  combineFactors,
  injuryFactor,
  recentFormFactor,
  restAsymmetryFactor,
} from "@/lib/model-factors";

describe("restAsymmetryFactor", () => {
  it("returns null when rest is equal or unknown", () => {
    expect(restAsymmetryFactor({ homeTeam: "Mexico", awayTeam: "Brazil", homeRestDays: 4, awayRestDays: 4 })).toBeNull();
    expect(restAsymmetryFactor({ homeTeam: "Mexico", awayTeam: "Brazil", homeRestDays: null, awayRestDays: 4 })).toBeNull();
  });

  it("favors the more-rested team", () => {
    const f = restAsymmetryFactor({ homeTeam: "Mexico", awayTeam: "Brazil", homeRestDays: 5, awayRestDays: 3 });
    expect(f).not.toBeNull();
    expect(f!.elo_delta).toBeGreaterThan(0);
    const away = restAsymmetryFactor({ homeTeam: "Mexico", awayTeam: "Brazil", homeRestDays: 3, awayRestDays: 6 });
    expect(away!.elo_delta).toBeLessThan(0);
  });
});

describe("recentFormFactor", () => {
  it("nudges toward the hotter side", () => {
    const f = recentFormFactor("Mexico", "Brazil", { score: 0.6, matches: 10 }, { score: -0.2, matches: 10 });
    expect(f!.elo_delta).toBeGreaterThan(0);
  });

  it("returns null on negligible difference", () => {
    expect(
      recentFormFactor("Mexico", "Brazil", { score: 0.1, matches: 5 }, { score: 0.1, matches: 5 }),
    ).toBeNull();
  });
});

describe("injuryFactor", () => {
  it("penalizes the team with a ruled-out player", () => {
    const f = injuryFactor("Mexico", "South Africa", [
      {
        team: "Mexico",
        player: "Star",
        status: "ruled_out",
        headline: "Star ruled out",
        source: "curated",
      },
    ]);
    expect(f).not.toBeNull();
    expect(f!.elo_delta).toBeLessThan(0); // home (Mexico) hurt -> negative home delta
  });

  it("returns null with no reports", () => {
    expect(injuryFactor("Mexico", "South Africa", [])).toBeNull();
  });
});

describe("combineFactors", () => {
  it("sums and caps deltas", () => {
    const adj = combineFactors([
      restAsymmetryFactor({ homeTeam: "Mexico", awayTeam: "Brazil", homeRestDays: 6, awayRestDays: 3 }),
      recentFormFactor("Mexico", "Brazil", { score: 0.9, matches: 10 }, { score: -0.9, matches: 10 }),
    ]);
    expect(adj.factors).toHaveLength(2);
    expect(Math.abs(adj.total_elo_delta)).toBeLessThanOrEqual(120);
  });

  it("ignores nulls", () => {
    const adj = combineFactors([null, null]);
    expect(adj.factors).toHaveLength(0);
    expect(adj.total_elo_delta).toBe(0);
  });
});
