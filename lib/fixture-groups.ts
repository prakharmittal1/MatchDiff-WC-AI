import type { Fixture } from "@/lib/fixtures";

const GROUP_RE = /Group\s+([A-L])\b/i;

export function fixtureGroup(competition: string): string | null {
  const m = GROUP_RE.exec(competition);
  if (!m?.[1]) return null;
  return `Group ${m[1].toUpperCase()}`;
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

export function countFixturesByGroup(fixtures: Fixture[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    const g = fixtureGroup(f.competition);
    if (!g) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return counts;
}
