import { canonicalizeTeam } from "@/lib/teams";

/** Human-readable label for fixturedownload team slots (e.g. `1L`, `3CEFHI`, TBD). */
export function formatScheduleTeamName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "TBD";
  if (/to be announced/i.test(trimmed)) return "TBD";

  const canonical = canonicalizeTeam(trimmed);
  if (canonical) return canonical;

  const winner = /^1([A-L])$/i.exec(trimmed);
  if (winner?.[1]) return `Winner Group ${winner[1].toUpperCase()}`;

  const runnerUp = /^2([A-L])$/i.exec(trimmed);
  if (runnerUp?.[1]) return `Runner-up Group ${runnerUp[1].toUpperCase()}`;

  const third = /^3([A-L]+)$/i.exec(trimmed);
  if (third?.[1]) {
    const groups = third[1].toUpperCase().split("").join("/");
    return `3rd place (${groups})`;
  }

  return trimmed;
}

export function isAnalyzableTeamName(name: string): boolean {
  return canonicalizeTeam(name) != null;
}

export function isAnalyzableFixture(home: string, away: string): boolean {
  return isAnalyzableTeamName(home) && isAnalyzableTeamName(away);
}
