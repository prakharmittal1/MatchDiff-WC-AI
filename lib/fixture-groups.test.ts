import { describe, expect, it } from "vitest";

import {
  filterFixturesByGroup,
  fixtureGroup,
  groupLetter,
  listFixtureGroups,
} from "@/lib/fixture-groups";
import type { Fixture } from "@/lib/fixtures";

function fx(competition: string): Fixture {
  return {
    id: competition,
    home: "Mexico",
    away: "Brazil",
    kickoff_iso: "2026-06-11T19:00:00Z",
    competition,
    market_home_win: 0.5,
  };
}

describe("fixtureGroup", () => {
  it("parses group from competition string", () => {
    expect(fixtureGroup("FIFA World Cup · Group A")).toBe("Group A");
    expect(fixtureGroup("FIFA World Cup · Group L")).toBe("Group L");
    expect(groupLetter("Group C")).toBe("C");
  });

  it("filters fixtures by group", () => {
    const fixtures = [fx("FIFA World Cup · Group A"), fx("FIFA World Cup · Group B")];
    expect(listFixtureGroups(fixtures)).toEqual(["Group A", "Group B"]);
    expect(filterFixturesByGroup(fixtures, "Group B")).toHaveLength(1);
    expect(filterFixturesByGroup(fixtures, "all")).toHaveLength(2);
  });
});
