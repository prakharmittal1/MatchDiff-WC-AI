import { describe, expect, it } from "vitest";

import { isGenericHeadline } from "@/lib/sentiment/news";

describe("isGenericHeadline", () => {
  it("flags TV guide and schedule roundups", () => {
    expect(isGenericHeadline("How to watch the 2026 Men's World Cup: TV, streaming, full schedule")).toBe(
      true,
    );
    expect(isGenericHeadline("What time are World Cup 2026 matches in my time zone?")).toBe(true);
    expect(
      isGenericHeadline("Mexico vs. South Africa - Kick-off time, team news, how to watch FIFA opener"),
    ).toBe(true);
  });

  it("allows preview and analysis headlines", () => {
    expect(isGenericHeadline("Can South Africa surprise Mexico in World Cup opener?")).toBe(false);
    expect(isGenericHeadline("Mexico and South Africa face off again after 16 years of challenges")).toBe(
      false,
    );
    expect(isGenericHeadline("World Cup 2026 odds: Mexico looking to restore soccer standing")).toBe(
      false,
    );
  });
});
