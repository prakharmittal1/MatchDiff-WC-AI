import { describe, expect, it } from "vitest";

import { polyPillStyle } from "@/lib/odds-colors";

function parseRgb(color: string): [number, number, number] | null {
  const m = /rgb\((\d+)\s+(\d+)\s+(\d+)\)/.exec(color);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance(rgb: [number, number, number]): number {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

describe("odds-colors", () => {
  it("deepens green as home probability rises", () => {
    const low = parseRgb(polyPillStyle(0.6, "home").backgroundColor)!;
    const high = parseRgb(polyPillStyle(0.9, "home").backgroundColor)!;
    expect(luminance(high)).toBeLessThan(luminance(low));
  });

  it("deepens red as away probability rises", () => {
    const low = parseRgb(polyPillStyle(0.55, "away").backgroundColor)!;
    const high = parseRgb(polyPillStyle(0.92, "away").backgroundColor)!;
    expect(luminance(high)).toBeLessThan(luminance(low));
  });
});
