import type { Fixture } from "@/lib/fixtures";

const GROUP_RE = /Group\s+([A-L])\b/i;
const COMPETITION_SEP = " · ";
const KNOCKOUT_ROUNDS = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi Final 1",
  "Semi Final 2",
  "3rd Place Match",
  "Final",
] as const;

const KNOCKOUT_ROUND_SET: ReadonlySet<string> = new Set(KNOCKOUT_ROUNDS);

export type FixtureStage = "all" | `Group ${string}` | (typeof KNOCKOUT_ROUNDS)[number];

export function fixtureGroup(competition: string): string | null {
  const m = GROUP_RE.exec(competition);
  if (!m?.[1]) return null;
  return `Group ${m[1].toUpperCase()}`;
}

export function fixtureRound(competition: string): string | null {
  const stage = competition.split(COMPETITION_SEP).pop()?.trim() ?? "";
  return KNOCKOUT_ROUND_SET.has(stage) ? stage : null;
}

export function fixtureStage(competition: string): string | null {
  return fixtureGroup(competition) ?? fixtureRound(competition);
}

/** Letter only for UI labels (e.g. "Group C" → "C"). */
export function groupLetter(group: string): string {
  const m = GROUP_RE.exec(group);
  return m?.[1]?.toUpperCase() ?? group;
}

export function listFixtureStages(fixtures: Fixture[]): string[] {
  const set = new Set<string>();
  for (const f of fixtures) {
    const stage = fixtureStage(f.competition);
    if (stage) set.add(stage);
  }

  const groups = [...set].filter((s) => s.startsWith("Group ")).sort((a, b) => a.localeCompare(b));
  const rounds = KNOCKOUT_ROUNDS.filter((r) => set.has(r));
  return [...groups, ...rounds];
}

/** @deprecated Use listFixtureStages */
export const listFixtureGroups = listFixtureStages;

export function filterFixturesByStage(fixtures: Fixture[], stage: string | "all"): Fixture[] {
  if (stage === "all") return fixtures;
  return fixtures.filter((f) => fixtureStage(f.competition) === stage);
}

/** @deprecated Use filterFixturesByStage */
export const filterFixturesByGroup = filterFixturesByStage;
