import type { Wc2026Team } from "@/lib/teams";

/** Short names for news search APIs. */
const SEARCH_ALIASES: Partial<Record<Wc2026Team, string[]>> = {
  "United States": ["USA", "USMNT", "America"],
  Netherlands: ["Holland", "Oranje"],
  "South Korea": ["Korea", "KOR"],
  "Ivory Coast": ["CIV", "Côte d'Ivoire"],
};

export function searchTermsForTeam(team: Wc2026Team): string[] {
  const aliases = SEARCH_ALIASES[team] ?? [];
  return [team, ...aliases];
}

export function newsSearchQuery(home: Wc2026Team, away: Wc2026Team): string {
  const h = searchTermsForTeam(home)[0]!;
  const a = searchTermsForTeam(away)[0]!;
  return `"${h}" "${a}" World Cup 2026`;
}

/** Narrower query for preview / opinion pieces (merged with broad search). */
export function newsPreviewQuery(home: Wc2026Team, away: Wc2026Team): string {
  const h = searchTermsForTeam(home)[0]!;
  const a = searchTermsForTeam(away)[0]!;
  return `"${h}" "${a}" World Cup preview OR prediction OR odds OR injury`;
}

export function injuryTeamQuery(team: Wc2026Team): string {
  const t = searchTermsForTeam(team)[0]!;
  return `"${t}" (injury OR injured OR "ruled out" OR doubtful OR sidelined) (soccer OR football OR "World Cup" OR FIFA) 2026`;
}

export function injuryFixtureQuery(home: Wc2026Team, away: Wc2026Team): string {
  const h = searchTermsForTeam(home)[0]!;
  const a = searchTermsForTeam(away)[0]!;
  return `"${h}" "${a}" (injury OR injured OR "ruled out" OR doubtful) (soccer OR football OR "World Cup" OR FIFA)`;
}
