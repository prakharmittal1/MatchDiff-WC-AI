import venuesData from "@/data/wc26-match-venues.json";
import { canonicalizeTeam, type Wc2026Team } from "@/lib/teams";

type RawMatch = { home: string; away: string; date: string };

/** Ascending list of match dates (YYYY-MM-DD) per team across the WC26 schedule. */
const TEAM_DATES: Map<Wc2026Team, string[]> = (() => {
  const map = new Map<Wc2026Team, string[]>();
  for (const row of venuesData.matches as RawMatch[]) {
    const home = canonicalizeTeam(row.home);
    const away = canonicalizeTeam(row.away);
    if (!row.date) continue;
    for (const team of [home, away]) {
      if (!team) continue;
      const arr = map.get(team) ?? [];
      arr.push(row.date);
      map.set(team, arr);
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.localeCompare(b));
  return map;
})();

function daysBetween(aIso: string, bIso: string): number | null {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** Rest days for a team before `kickoffDate` = gap since its previous fixture. */
export function restDaysBefore(team: Wc2026Team, kickoffDate: string): number | null {
  const dates = TEAM_DATES.get(team);
  if (!dates || dates.length === 0) return null;
  let prev: string | null = null;
  for (const d of dates) {
    if (d >= kickoffDate) break;
    prev = d;
  }
  if (!prev) return null;
  return daysBetween(kickoffDate, prev);
}

export function restDaysForFixture(
  home: Wc2026Team,
  away: Wc2026Team,
  kickoffDate: string,
): { homeRestDays: number | null; awayRestDays: number | null } {
  return {
    homeRestDays: restDaysBefore(home, kickoffDate),
    awayRestDays: restDaysBefore(away, kickoffDate),
  };
}
