import { describe, expect, it } from "vitest";

import { classifyContextNote } from "@/lib/context-notes";

describe("classifyContextNote", () => {
  it("classifies tournament-wide travel notes", () => {
    expect(
      classifyContextNote(
        "Tournament spans Mexico, USA, and Canada (~4,000 km); jet lag and inter-city travel are routine.",
      ),
    ).toBe("tournament");
  });

  it("classifies team travel between host cities", () => {
    expect(
      classifyContextNote(
        "Haiti travel between host cities in the US, Mexico, and Canada; shorter hops than a typical overseas World Cup, but time zones still vary.",
      ),
    ).toBe("travel");
  });

  it("classifies sea-level venue notes", () => {
    expect(classifyContextNote("Sea-level northeast US.")).toBe("altitude");
  });

  it("classifies US climate spread", () => {
    expect(
      classifyContextNote(
        "US host cities vary from cool Pacific (Seattle) to Gulf heat (Miami/Houston); climate mismatch between games is common.",
      ),
    ).toBe("climate");
  });
});
