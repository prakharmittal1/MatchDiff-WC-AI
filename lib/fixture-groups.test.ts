import { describe, expect, it } from "vitest";

import {
  filterFixturesByStage,
  fixtureGroup,
  fixtureRound,
  fixtureStage,
  fixturesSectionTitle,
  groupLetter,
  listFixtureStages,
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
  it("parses group and knockout stage from competition string", () => {
    expect(fixtureGroup("FIFA World Cup · Group A")).toBe("Group A");
    expect(fixtureGroup("FIFA World Cup · Group L")).toBe("Group L");
    expect(fixtureRound("FIFA World Cup · Round of 32")).toBe("Round of 32");
    expect(fixtureStage("FIFA World Cup · Quarter-finals")).toBe("Quarter-finals");
    expect(groupLetter("Group C")).toBe("C");
  });

  it("filters fixtures by stage", () => {
    const fixtures = [
      fx("FIFA World Cup · Group A"),
      fx("FIFA World Cup · Group B"),
      fx("FIFA World Cup · Round of 32"),
    ];
    expect(listFixtureStages(fixtures)).toEqual([
      "Group A",
      "Group B",
      "Round of 32",
    ]);
    expect(filterFixturesByStage(fixtures, "Group B")).toHaveLength(1);
    expect(filterFixturesByStage(fixtures, "Round of 32")).toHaveLength(1);
    expect(filterFixturesByStage(fixtures, "all")).toHaveLength(3);
  });

  it("titles the section from the furthest knockout round", () => {
    expect(fixturesSectionTitle([fx("FIFA World Cup · Final")])).toBe("Final");
    expect(
      fixturesSectionTitle([
        fx("FIFA World Cup · Semi Final 1"),
        fx("FIFA World Cup · Semi Final 2"),
      ]),
    ).toBe("Semi-finals");
    expect(fixturesSectionTitle([fx("FIFA World Cup · Group A")])).toBe(
      "Group stage - Fixtures",
    );
  });
});
