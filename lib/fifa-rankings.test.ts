import { describe, expect, it } from "vitest";

import { fifaRankFor, formatTeamWithRank } from "@/lib/fifa-rankings";

describe("fifa rankings", () => {
  it("looks up canonical team ranks", () => {
    expect(fifaRankFor("France")).toBe(1);
    expect(fifaRankFor("USA")).toBe(16);
  });

  it("formats team with rank", () => {
    expect(formatTeamWithRank("France")).toBe("France (1)");
    expect(formatTeamWithRank("Unknownland")).toBe("Unknownland");
  });
});
