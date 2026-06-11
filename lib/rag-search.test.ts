import { describe, expect, it } from "vitest";

import { searchPlaybookChunks } from "@/lib/rag-search";
import type { PlaybookChunk } from "@/lib/rag-types";

const CHUNKS: PlaybookChunk[] = [
  {
    id: "1",
    content: "Mexico beat USA 2-1 in a friendly.",
    date: "2024-03-01",
    home: "Mexico",
    away: "United States",
    tournament: "Friendly",
    home_score: 2,
    away_score: 1,
    neutral: false,
  },
  {
    id: "2",
    content: "Brazil won the World Cup final.",
    date: "2022-12-18",
    home: "Argentina",
    away: "France",
    tournament: "FIFA World Cup",
    home_score: 3,
    away_score: 3,
    neutral: true,
  },
];

describe("searchPlaybookChunks", () => {
  it("ranks direct H2H highest", () => {
    const hits = searchPlaybookChunks(CHUNKS, "Mexico", "United States", 2);
    expect(hits[0]?.id).toBe("1");
  });

  it("returns only direct head-to-head meetings", () => {
    const chunks: PlaybookChunk[] = [
      ...CHUNKS,
      {
        id: "3",
        content: "On 2025-09-04 in FIFA World Cup qualification at Rio de Janeiro, Brazil: Brazil 3-0 Chile.",
        date: "2025-09-04",
        home: "Brazil",
        away: "Chile",
        tournament: "FIFA World Cup qualification",
        home_score: 3,
        away_score: 0,
        neutral: false,
      },
      {
        id: "4",
        content:
          "On 1998-06-16 in FIFA World Cup at Nantes, France: Brazil 3-0 Morocco (neutral).",
        date: "1998-06-16",
        home: "Brazil",
        away: "Morocco",
        tournament: "FIFA World Cup",
        home_score: 3,
        away_score: 0,
        neutral: true,
      },
    ];

    const hits = searchPlaybookChunks(chunks, "Brazil", "Morocco", 6);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe("4");
  });
});
