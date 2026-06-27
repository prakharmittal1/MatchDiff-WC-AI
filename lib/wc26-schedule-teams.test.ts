import { describe, expect, it } from "vitest";

import { formatScheduleTeamName, isAnalyzableFixture } from "@/lib/wc26-schedule-teams";

describe("formatScheduleTeamName", () => {
  it("canonicalizes known teams and formats knockout slots", () => {
    expect(formatScheduleTeamName("USA")).toBe("United States");
    expect(formatScheduleTeamName("Cabo Verde")).toBe("Cape Verde");
    expect(formatScheduleTeamName("1L")).toBe("Winner Group L");
    expect(formatScheduleTeamName("2J")).toBe("Runner-up Group J");
    expect(formatScheduleTeamName("3CEFHI")).toBe("3rd place (C/E/F/H/I)");
    expect(formatScheduleTeamName("To be announced")).toBe("TBD");
  });

  it("detects analyzable fixtures", () => {
    expect(isAnalyzableFixture("Brazil", "Japan")).toBe(true);
    expect(isAnalyzableFixture("Winner Group L", "TBD")).toBe(false);
  });
});
