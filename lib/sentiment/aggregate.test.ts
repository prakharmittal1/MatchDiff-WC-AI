import { describe, expect, it } from "vitest";

import { buildSentimentSnapshot } from "@/lib/sentiment/aggregate";
import type { RawSentimentItem, SentimentSourceStatus } from "@/lib/sentiment/types";

const sources: SentimentSourceStatus[] = [
  { id: "news", label: "News", status: "ok", count: 2 },
];

describe("buildSentimentSnapshot", () => {
  it("detects positive home tone from headlines", () => {
    const items: RawSentimentItem[] = [
      {
        source: "news",
        text: "Netherlands look strong and should win against Japan at World Cup 2026",
        title: "Netherlands favored",
      },
      {
        source: "news",
        text: "Japan struggle with injuries ahead of World Cup clash",
        title: "Japan injury doubts",
      },
    ];
    const snap = buildSentimentSnapshot(
      "Netherlands",
      "Japan",
      "2026-06-14T18:00:00Z",
      items,
      sources,
    );
    expect(snap.post_count).toBe(2);
    expect(snap.home_tone).toBe("positive");
    expect(snap.coverage_quality).toBe("strong");
    expect(snap.sample_quotes.length).toBeGreaterThan(0);
    expect(snap.summary_line).toMatch(/headline/);
  });

  it("summarizes multiple news headlines", () => {
    const items: RawSentimentItem[] = [
      {
        source: "news",
        text: "Brazil look strong going into this World Cup clash",
        title: "Brazil favored in preview",
      },
      {
        source: "news",
        text: "France injury doubts ahead of World Cup meeting with Brazil",
        title: "France doubts",
      },
    ];
    const snap = buildSentimentSnapshot(
      "Brazil",
      "France",
      "2026-07-01T20:00:00Z",
      items,
      [{ id: "news", label: "News", status: "ok", count: 2 }],
    );
    expect(snap.summary_line).toMatch(/2 preview headlines/);
  });

  it("marks schedule-only coverage as weak", () => {
    const items: RawSentimentItem[] = [
      {
        source: "news",
        text: "Mexico vs South Africa World Cup 2026 kick-off time and venue details",
        title: "Mexico vs South Africa kick-off time",
      },
    ];
    const snap = buildSentimentSnapshot(
      "Mexico",
      "South Africa",
      "2026-06-11T19:00:00Z",
      items,
      sources,
      [],
    );
    expect(snap.coverage_quality).toBe("weak");
    expect(snap.themes).toEqual([]);
    expect(snap.summary_line).toMatch(/mostly TV schedules and logistics/);
  });

  it("treats injury reports as strong coverage", () => {
    const snap = buildSentimentSnapshot(
      "Mexico",
      "South Africa",
      "2026-06-11T19:00:00Z",
      [],
      sources,
      [
        {
          team: "Mexico",
          player: "Test Player",
          status: "doubtful",
          headline: "Test Player doubtful for opener",
          source: "curated",
        },
      ],
    );
    expect(snap.coverage_quality).toBe("strong");
    expect(snap.injury_reports).toHaveLength(1);
    expect(snap.summary_line).toMatch(/injury update/);
    expect(snap.themes).not.toContain("Injuries & fitness");
  });

  it("returns empty summary when no items", () => {
    const snap = buildSentimentSnapshot(
      "Brazil",
      "France",
      "2026-07-01T20:00:00Z",
      [],
      [],
    );
    expect(snap.post_count).toBe(0);
    expect(snap.summary_line).toBeNull();
  });
});
