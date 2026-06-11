import rankingsFile from "@/data/fifa-rankings.json";

import { canonicalizeTeam } from "@/lib/teams";

type RankingsFile = {
  as_of?: string;
  rankings?: Record<string, number>;
};

const file = rankingsFile as RankingsFile;

const RANK_BY_TEAM = new Map<string, number>(
  Object.entries(file.rankings ?? {}).flatMap(([name, rank]) => {
    const team = canonicalizeTeam(name);
    if (!team || !Number.isFinite(rank)) return [];
    return [[team, rank] as const];
  }),
);

/** FIFA world ranking (1 = best), or null if unknown. */
export function fifaRankFor(team: string): number | null {
  const canonical = canonicalizeTeam(team);
  if (!canonical) return null;
  return RANK_BY_TEAM.get(canonical) ?? null;
}

/** Display label, e.g. "France (1)". */
export function formatTeamWithRank(team: string): string {
  const rank = fifaRankFor(team);
  return rank != null ? `${team} (${rank})` : team;
}

/** Bracketed rank only, e.g. "(1)". */
export function formatFifaRank(rank: number): string {
  return `(${rank})`;
}
