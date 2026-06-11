import { describe, expect, it } from "vitest";

import {
  classifyInjuryStatus,
  extractPlayerFromHeadline,
  isInjuryHeadline,
} from "@/lib/sentiment/injuries";

describe("injury parsing", () => {
  it("detects injury headlines", () => {
    expect(isInjuryHeadline("Mexico striker ruled out of World Cup opener")).toBe(true);
    expect(isInjuryHeadline("How to watch Mexico vs South Africa")).toBe(false);
  });

  it("classifies ruled out vs doubtful", () => {
    expect(classifyInjuryStatus("Key midfielder ruled out for Mexico")).toBe("ruled_out");
    expect(classifyInjuryStatus("Star doubtful for South Africa clash")).toBe("doubtful");
  });

  it("extracts player names when present", () => {
    expect(extractPlayerFromHeadline("Mexico's Hirving Lozano ruled out", "Mexico")).toBe(
      "Hirving Lozano",
    );
    expect(
      extractPlayerFromHeadline("Percy Tau injury doubt for South Africa", "South Africa"),
    ).toBe("Percy Tau");
  });

  it("does not treat NFL headlines as injury reports", async () => {
    const { isSoccerOrFootballNews } = await import("@/lib/sentiment/soccer-filter");
    expect(
      isSoccerOrFootballNews("USA quarterback ruled out for NFL season with knee injury"),
    ).toBe(false);
    expect(isSoccerOrFootballNews("Mexico striker ruled out of World Cup opener")).toBe(true);
  });
});
