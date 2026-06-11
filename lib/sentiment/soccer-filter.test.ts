import { describe, expect, it } from "vitest";

import { isOtherSportHeadline, isSoccerOrFootballNews } from "@/lib/sentiment/soccer-filter";

describe("soccer-filter", () => {
  it("rejects other sports", () => {
    expect(isOtherSportHeadline("Chiefs quarterback ruled out for Super Bowl")).toBe(true);
    expect(isOtherSportHeadline("Lakers star doubtful for NBA playoffs")).toBe(true);
    expect(
      isSoccerOrFootballNews("USA linebacker Patrick Willis injury update for NFL season"),
    ).toBe(false);
  });

  it("accepts soccer and football headlines", () => {
    expect(
      isSoccerOrFootballNews("Mexico striker ruled out of World Cup opener"),
    ).toBe(true);
    expect(
      isSoccerOrFootballNews("Netherlands midfielder doubtful for FIFA World Cup clash"),
    ).toBe(true);
    expect(
      isSoccerOrFootballNews("USMNT injury concern ahead of group stage"),
    ).toBe(true);
  });

  it("accepts fixture context when both teams are named", () => {
    expect(
      isSoccerOrFootballNews("Mexico vs South Africa: key injury doubt before opener", {
        home: "Mexico",
        away: "South Africa",
      }),
    ).toBe(true);
  });

  it("rejects generic non-football stories", () => {
    expect(isSoccerOrFootballNews("How to watch the summer concert series")).toBe(false);
    expect(
      isSoccerOrFootballNews("Mexico economy grows in latest quarter"),
    ).toBe(false);
  });
});
