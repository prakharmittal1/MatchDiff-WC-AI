import { fifaRankFor } from "@/lib/fifa-rankings";
import type { MarketThreeWay } from "@/lib/fixtures";

/** Convert FIFA rank (1 = best) into a positive strength weight. */
function strengthFromRank(rank: number): number {
  return Math.pow(Math.max(1, rank), -0.85);
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}

/**
 * Illustrative three-way prices from FIFA world rankings.
 * Better-ranked teams get higher win prices; closer ranks raise the draw.
 */
export function oddsFromFifaRanks(
  homeTeam: string,
  awayTeam: string,
): MarketThreeWay | null {
  const homeRank = fifaRankFor(homeTeam);
  const awayRank = fifaRankFor(awayTeam);
  if (homeRank == null || awayRank == null) return null;

  const sHome = strengthFromRank(homeRank);
  const sAway = strengthFromRank(awayRank);
  const total = sHome + sAway;
  if (total <= 0) return null;

  const closeness = 1 - Math.abs(sHome - sAway) / total;
  const draw = Math.min(0.34, Math.max(0.2, 0.22 + 0.1 * closeness));
  const rem = 1 - draw;
  let home = rem * (sHome / total);
  let away = rem * (sAway / total);

  home = round4(home);
  away = round4(away);
  const drawRounded = round4(1 - home - away);

  if (drawRounded <= 0 || home <= 0 || away <= 0) return null;

  return { home, draw: drawRounded, away };
}
