import type { Fixture } from "@/lib/fixtures";

const GROUP_RE = /Group\s+([A-L])\b/i;

export function fixtureGroup(competition: string): string | null {
  const m = GROUP_RE.exec(competition);
  if (!m?.[1]) return null;
  return `Group ${m[1].toUpperCase()}`;
}

/** Letter only for UI labels (e.g. "Group C" → "C"). */
export function groupLetter(group: string): string {
  const m = GROUP_RE.exec(group);
  return m?.[1]?.toUpperCase() ?? group;
}

export function listFixtureGroups(fixtures: Fixture[]): string[] {
  const set = new Set<string>();
  for (const f of fixtures) {
    const g = fixtureGroup(f.competition);
    if (g) set.add(g);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterFixturesByGroup(fixtures: Fixture[], group: string | "all"): Fixture[] {
  if (group === "all") return fixtures;
  return fixtures.filter((f) => fixtureGroup(f.competition) === group);
}
