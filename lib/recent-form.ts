import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FormScore } from "@/lib/model-factors";
import { canonicalizeTeam, type Wc2026Team } from "@/lib/teams";

type RecentFormFile = {
  teams?: Record<string, { score: number; matches: number }>;
};

let cached: Map<Wc2026Team, FormScore> | null = null;

function load(): Map<Wc2026Team, FormScore> {
  if (cached) return cached;
  const map = new Map<Wc2026Team, FormScore>();
  try {
    const raw = readFileSync(
      join(process.cwd(), "data", "processed", "recent-form.json"),
      "utf8",
    );
    const file = JSON.parse(raw) as RecentFormFile;
    for (const [name, v] of Object.entries(file.teams ?? {})) {
      const team = canonicalizeTeam(name);
      if (!team || !Number.isFinite(v.score)) continue;
      map.set(team, { score: v.score, matches: v.matches });
    }
  } catch {
    // No form file yet — run `npm run data:build`.
  }
  cached = map;
  return map;
}

export function recentFormFor(team: Wc2026Team): FormScore | null {
  return load().get(team) ?? null;
}
