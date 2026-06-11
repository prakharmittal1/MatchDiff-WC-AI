import { describe, expect, it } from "vitest";

import { isIncompleteInjuryFragment } from "@/lib/sentiment/injury-text";

describe("injury text filters", () => {
  it("flags incomplete injury fragments only", () => {
    expect(
      isIncompleteInjuryFragment(
        "as Jurrien Timber, Netherlands Key Player, due to hamstring",
      ),
    ).toBe(true);
    expect(isIncompleteInjuryFragment("as Jurrien Timber, due to hamstring")).toBe(true);
    expect(
      isIncompleteInjuryFragment("Jurrien Timber ruled out for Netherlands with hamstring injury."),
    ).toBe(false);
    expect(isIncompleteInjuryFragment("Netherlands have injury concerns ahead of the opener")).toBe(
      false,
    );
  });
});
