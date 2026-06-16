import type { Fixture } from "@/lib/fixtures";

/** Hide fixtures this long after kickoff (90 min + ET + buffer). */
export const FIXTURE_CONCLUDED_AFTER_MS = 2 * 60 * 60 * 1000;

export function fixtureConcludesAtMs(kickoff_iso: string): number | null {
  const kickoff = Date.parse(kickoff_iso);
  if (!Number.isFinite(kickoff)) return null;
  return kickoff + FIXTURE_CONCLUDED_AFTER_MS;
}

export function isFixtureUpcoming(
  fixture: Pick<Fixture, "kickoff_iso">,
  nowMs: number = Date.now(),
): boolean {
  const concludesAt = fixtureConcludesAtMs(fixture.kickoff_iso);
  if (concludesAt == null) return true;
  return nowMs < concludesAt;
}

export function filterUpcomingFixtures<T extends Pick<Fixture, "kickoff_iso">>(
  fixtures: T[],
  nowMs: number = Date.now(),
): T[] {
  return fixtures.filter((f) => isFixtureUpcoming(f, nowMs));
}
