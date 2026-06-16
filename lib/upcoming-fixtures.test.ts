import { describe, expect, it } from "vitest";

import {
  filterUpcomingFixtures,
  FIXTURE_CONCLUDED_AFTER_MS,
  isFixtureUpcoming,
} from "@/lib/upcoming-fixtures";

describe("upcoming-fixtures", () => {
  const kickoff = "2026-06-11T19:00:00Z";
  const kickoffMs = Date.parse(kickoff);

  it("keeps fixtures before kickoff", () => {
    expect(isFixtureUpcoming({ kickoff_iso: kickoff }, kickoffMs - 60_000)).toBe(true);
  });

  it("keeps fixtures shortly after kickoff", () => {
    expect(
      isFixtureUpcoming({ kickoff_iso: kickoff }, kickoffMs + 30 * 60_000),
    ).toBe(true);
  });

  it("drops fixtures after the concluded window", () => {
    expect(
      isFixtureUpcoming(
        { kickoff_iso: kickoff },
        kickoffMs + FIXTURE_CONCLUDED_AFTER_MS,
      ),
    ).toBe(false);
  });

  it("filters a mixed list", () => {
    const fixtures = [
      { id: "a", kickoff_iso: "2026-06-11T19:00:00Z" },
      { id: "b", kickoff_iso: "2026-06-20T19:00:00Z" },
    ];
    const now = kickoffMs + FIXTURE_CONCLUDED_AFTER_MS;
    expect(filterUpcomingFixtures(fixtures, now).map((f) => f.id)).toEqual(["b"]);
  });
});
