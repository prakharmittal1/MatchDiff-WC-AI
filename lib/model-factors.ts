import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ModelAdjustments, ModelFactor } from "@/lib/alpha-types";
import type { InjuryReport } from "@/lib/sentiment/types";
import { canonicalizeTeam, type Wc2026Team } from "@/lib/teams";

/**
 * All factors are expressed as a signed Elo-point delta on the HOME team.
 * Positive = favors home. They sum into total_elo_delta, which the engine
 * folds into the Elo win-probability calc (consistent units throughout).
 *
 * Coefficients are intentionally conservative; these are nudges, not the model.
 */

const MAX_TOTAL_DELTA = 120; // cap combined swing (~ +/- 17pp at parity)

function loadJson<T>(...parts: string[]): T | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ...parts), "utf8")) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Rest-days asymmetry
// ---------------------------------------------------------------------------

const REST_ELO_PER_DAY = 18; // each extra rest day vs opponent ~ +18 Elo
const REST_MAX_DELTA = 45;

export type RestInput = {
  homeTeam: Wc2026Team;
  awayTeam: Wc2026Team;
  homeRestDays: number | null;
  awayRestDays: number | null;
};

export function restAsymmetryFactor(input: RestInput): ModelFactor | null {
  const { homeTeam, awayTeam, homeRestDays, awayRestDays } = input;
  if (homeRestDays == null || awayRestDays == null) return null;
  const diff = homeRestDays - awayRestDays;
  if (diff === 0) return null;

  const delta = clampMagnitude(diff * REST_ELO_PER_DAY, REST_MAX_DELTA);
  const moreRestedTeam = diff > 0 ? homeTeam : awayTeam;
  return {
    id: "rest_asymmetry",
    label: "Rest advantage",
    elo_delta: delta,
    detail: `${moreRestedTeam} have ${Math.abs(diff)} more rest day${Math.abs(diff) === 1 ? "" : "s"} (${homeTeam} ${homeRestDays}d vs ${awayTeam} ${awayRestDays}d).`,
  };
}

// ---------------------------------------------------------------------------
// 2. Recent form (exponential decay)
// ---------------------------------------------------------------------------

const FORM_ELO_SCALE = 70; // form score in [-1,1] maps to +/- 70 Elo
const FORM_MAX_DELTA = 55;

export type FormScore = {
  /** Exponentially weighted form in [-1, 1]; positive = winning recently. */
  score: number;
  matches: number;
};

export function recentFormFactor(
  homeTeam: Wc2026Team,
  awayTeam: Wc2026Team,
  homeForm: FormScore | null,
  awayForm: FormScore | null,
): ModelFactor | null {
  if (!homeForm && !awayForm) return null;
  const h = homeForm?.score ?? 0;
  const a = awayForm?.score ?? 0;
  const diff = h - a;
  if (Math.abs(diff) < 0.02) return null;

  const delta = clampMagnitude(diff * FORM_ELO_SCALE, FORM_MAX_DELTA);
  const hotterTeam = diff > 0 ? homeTeam : awayTeam;
  return {
    id: "recent_form",
    label: "Recent form",
    elo_delta: delta,
    detail: `Recent form favors ${hotterTeam}. They've had the stronger run lately.`,
  };
}

// ---------------------------------------------------------------------------
// 3. Squad market value (talent proxy)
// ---------------------------------------------------------------------------

type SquadValuesFile = {
  values?: Record<string, number>;
};

let cachedSquadValues: Map<Wc2026Team, number> | null = null;
let cachedSquadMedian = 0;

function loadSquadValues(): { map: Map<Wc2026Team, number>; median: number } {
  if (cachedSquadValues) return { map: cachedSquadValues, median: cachedSquadMedian };
  const file = loadJson<SquadValuesFile>("data", "squad-values.json");
  const map = new Map<Wc2026Team, number>();
  const nums: number[] = [];
  for (const [name, value] of Object.entries(file?.values ?? {})) {
    const team = canonicalizeTeam(name);
    if (!team || !Number.isFinite(value)) continue;
    map.set(team, value);
    nums.push(value);
  }
  nums.sort((x, y) => x - y);
  cachedSquadValues = map;
  cachedSquadMedian = nums.length ? nums[Math.floor(nums.length / 2)]! : 0;
  return { map, median: cachedSquadMedian };
}

const SQUAD_ELO_SCALE = 55; // log-value gap -> Elo
const SQUAD_MAX_DELTA = 60;

export function squadValueFactor(home: Wc2026Team, away: Wc2026Team): ModelFactor | null {
  const { map, median } = loadSquadValues();
  if (median <= 0) return null;
  const hv = map.get(home) ?? median;
  const av = map.get(away) ?? median;
  if (!map.has(home) && !map.has(away)) return null;

  // log ratio so a €1.2B vs €60M gap doesn't explode; ~ +/- per doubling.
  const logGap = Math.log2(hv / av);
  if (Math.abs(logGap) < 0.05) return null;

  const delta = clampMagnitude(logGap * SQUAD_ELO_SCALE, SQUAD_MAX_DELTA);
  const richer = delta > 0 ? home : away;
  return {
    id: "squad_value",
    label: "Squad talent",
    elo_delta: delta,
    detail: `Squad value favors ${richer} (€${hv}M vs €${av}M).`,
  };
}

// ---------------------------------------------------------------------------
// 4. Injury penalty (dynamic squad-strength recompute)
// ---------------------------------------------------------------------------

const RULED_OUT_ELO = 28; // per ruled-out key player
const DOUBTFUL_ELO = 12; // per doubtful key player
const INJURY_MAX_PER_TEAM = 70;

export function injuryFactor(
  home: Wc2026Team,
  away: Wc2026Team,
  reports: InjuryReport[],
): ModelFactor | null {
  if (reports.length === 0) return null;

  const penaltyFor = (team: Wc2026Team): number => {
    let p = 0;
    for (const r of reports) {
      if (r.team !== team) continue;
      if (r.status === "ruled_out") p += RULED_OUT_ELO;
      else if (r.status === "doubtful") p += DOUBTFUL_ELO;
    }
    return Math.min(p, INJURY_MAX_PER_TEAM);
  };

  const homePenalty = penaltyFor(home);
  const awayPenalty = penaltyFor(away);
  if (homePenalty === 0 && awayPenalty === 0) return null;

  // Penalty on a team lowers its strength; net delta on home = awayPenalty - homePenalty.
  const delta = clampMagnitude(awayPenalty - homePenalty, INJURY_MAX_PER_TEAM);
  const worse = homePenalty > awayPenalty ? home : away;
  return {
    id: "injuries",
    label: "Injuries",
    elo_delta: delta,
    detail: `Injuries are costing ${worse} more. Missing or doubtful players pull down their chances.`,
  };
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export function combineFactors(factors: (ModelFactor | null)[]): ModelAdjustments {
  const present = factors.filter((f): f is ModelFactor => f !== null);
  const raw = present.reduce((sum, f) => sum + f.elo_delta, 0);
  const total = clampMagnitude(raw, MAX_TOTAL_DELTA);
  return {
    factors: present.map((f) => ({ ...f, elo_delta: Number(f.elo_delta.toFixed(1)) })),
    total_elo_delta: Number(total.toFixed(1)),
  };
}

function clampMagnitude(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}
