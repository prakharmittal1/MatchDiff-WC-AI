/**
 * Offline walk-forward evaluation on historical international matches.
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --file data/results.csv --split 0.8
 *
 * Produces:
 *   data/evals/latest.json
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { parse } from "csv-parse";

import { readFileSync } from "node:fs";

import { blendEloWithRag } from "@/lib/rag-form";
import { searchPlaybookChunks } from "@/lib/rag-search";
import type { PlaybookChunk } from "@/lib/rag-types";
import { canonicalizeTeam, type Wc2026Team } from "@/lib/teams";

const DEFAULT_FILE = "data/results.csv";
const DEFAULT_ELO = 1500;
const HOME_ADVANTAGE_ELO = 65;
const K_FACTOR = 20;
const OUT_DIR = join(process.cwd(), "data", "evals");

// Factor coefficients mirror lib/model-factors.ts (form + squad value only;
// rest-days and injuries are live-only signals with no historical record).
const FORM_WINDOW = 10;
const FORM_HALF_LIFE = 4;
const FORM_ELO_SCALE = 70;
const FORM_MAX_DELTA = 55;
const SQUAD_ELO_SCALE = 55;
const SQUAD_MAX_DELTA = 60;
const FACTOR_TOTAL_CAP = 120;

function clampMag(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

/** Rolling per-team outcome history for exponentially weighted form. */
const formHistory = new Map<Wc2026Team, number[]>(); // outcomes in [0,1], oldest first

function pushFormOutcome(team: Wc2026Team, outcome: number): void {
  const arr = formHistory.get(team) ?? [];
  arr.push(outcome);
  if (arr.length > FORM_WINDOW) arr.shift();
  formHistory.set(team, arr);
}

function formScore(team: Wc2026Team): number {
  const arr = formHistory.get(team);
  if (!arr || arr.length === 0) return 0;
  const lambda = Math.log(2) / FORM_HALF_LIFE;
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < arr.length; i += 1) {
    const ago = arr.length - 1 - i;
    const w = Math.exp(-lambda * ago);
    weighted += w * (arr[i]! * 2 - 1);
    weightSum += w;
  }
  return weightSum > 0 ? weighted / weightSum : 0;
}

function loadSquadValues(): { map: Map<Wc2026Team, number>; median: number } {
  const map = new Map<Wc2026Team, number>();
  const nums: number[] = [];
  try {
    const raw = readFileSync(join(process.cwd(), "data", "squad-values.json"), "utf8");
    const file = JSON.parse(raw) as { values?: Record<string, number> };
    for (const [name, value] of Object.entries(file.values ?? {})) {
      const team = canonicalizeTeam(name);
      if (!team || !Number.isFinite(value)) continue;
      map.set(team, value);
      nums.push(value);
    }
  } catch {
    // no file
  }
  nums.sort((a, b) => a - b);
  return { map, median: nums.length ? nums[Math.floor(nums.length / 2)]! : 0 };
}

function factorEloDelta(
  squad: { map: Map<Wc2026Team, number>; median: number },
  home: Wc2026Team,
  away: Wc2026Team,
): number {
  let total = 0;

  // Recent form
  const diff = formScore(home) - formScore(away);
  if (Math.abs(diff) >= 0.02) {
    total += clampMag(diff * FORM_ELO_SCALE, FORM_MAX_DELTA);
  }

  // Squad value (log2 ratio)
  if (squad.median > 0 && (squad.map.has(home) || squad.map.has(away))) {
    const hv = squad.map.get(home) ?? squad.median;
    const av = squad.map.get(away) ?? squad.median;
    const logGap = Math.log2(hv / av);
    if (Math.abs(logGap) >= 0.05) {
      total += clampMag(logGap * SQUAD_ELO_SCALE, SQUAD_MAX_DELTA);
    }
  }

  return clampMag(total, FACTOR_TOTAL_CAP);
}

type CsvRow = Record<string, string>;

type MatchRow = {
  date: string;
  home: Wc2026Team;
  away: Wc2026Team;
  homeScore: number;
  awayScore: number;
  tournament: string;
  neutral: boolean;
};

type Bucket = {
  index: number;
  count: number;
  avg_prob: number;
  home_win_rate: number;
};

type PredictorMetrics = {
  brier: number;
  log_loss: number;
  accuracy: number;
  avg_prob: number;
};

function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function clampProb(p: number): number {
  return Math.min(0.95, Math.max(0.05, p));
}

function key(home: Wc2026Team, away: Wc2026Team): string {
  return `${home}|${away}`;
}

function h2hAdjustment(
  h2h: Map<string, { home_wins: number; away_wins: number; draws: number; total: number }>,
  home: Wc2026Team,
  away: Wc2026Team,
): number {
  const rec = h2h.get(key(home, away));
  if (!rec || rec.total < 3) return 0;
  const homeRate = (rec.home_wins + 0.5 * rec.draws) / rec.total;
  return (homeRate - 0.5) * 0.06;
}

function updateState(
  ratings: Map<Wc2026Team, number>,
  h2h: Map<string, { home_wins: number; away_wins: number; draws: number; total: number }>,
  chunks: PlaybookChunk[],
  match: MatchRow,
): void {
  const rHome = ratings.get(match.home) ?? DEFAULT_ELO;
  const rAway = ratings.get(match.away) ?? DEFAULT_ELO;
  const adjHome = match.neutral ? rHome : rHome + HOME_ADVANTAGE_ELO;
  const eHome = expectedScore(adjHome, rAway);
  const sHome = match.homeScore > match.awayScore ? 1 : match.homeScore < match.awayScore ? 0 : 0.5;

  ratings.set(match.home, rHome + K_FACTOR * (sHome - eHome));
  ratings.set(match.away, rAway + K_FACTOR * ((1 - sHome) - (1 - eHome)));

  pushFormOutcome(match.home, sHome);
  pushFormOutcome(match.away, 1 - sHome);

  const k = key(match.home, match.away);
  const rec = h2h.get(k) ?? { home_wins: 0, away_wins: 0, draws: 0, total: 0 };
  if (match.homeScore > match.awayScore) rec.home_wins += 1;
  else if (match.homeScore < match.awayScore) rec.away_wins += 1;
  else rec.draws += 1;
  rec.total += 1;
  h2h.set(k, rec);

  const chunk: PlaybookChunk = {
    id: `eval-${match.date}-${match.home}-${match.away}-${chunks.length}`,
    content: `On ${match.date} in ${match.tournament}: ${match.home} ${match.homeScore}-${match.awayScore} ${match.away}${match.neutral ? " (neutral)" : ""}.`,
    date: match.date,
    home: match.home,
    away: match.away,
    tournament: match.tournament,
    home_score: match.homeScore,
    away_score: match.awayScore,
    neutral: match.neutral,
  };
  chunks.push(chunk);
}

async function readRows(path: string): Promise<MatchRow[]> {
  const rows: MatchRow[] = [];
  const parser = createReadStream(path).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true }),
  );

  for await (const raw of parser) {
    const row = raw as CsvRow;
    const home = canonicalizeTeam(row.home_team ?? row.home ?? "");
    const away = canonicalizeTeam(row.away_team ?? row.away ?? "");
    if (!home || !away) continue;

    const homeScore = Number(row.home_score);
    const awayScore = Number(row.away_score);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;

    const date = row.date?.trim();
    if (!date) continue;

    rows.push({
      date,
      home,
      away,
      homeScore,
      awayScore,
      tournament: row.tournament?.trim() || "match",
      neutral: String(row.neutral ?? "").toLowerCase() === "true",
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function finalizeMetrics(probs: number[], labels: number[]): PredictorMetrics {
  const n = probs.length;
  let brier = 0;
  let logLoss = 0;
  let correct = 0;
  let avgProb = 0;
  const eps = 1e-6;

  for (let i = 0; i < n; i += 1) {
    const p = probs[i]!;
    const y = labels[i]!;
    const pc = Math.min(1 - eps, Math.max(eps, p));
    brier += (pc - y) * (pc - y);
    logLoss += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
    avgProb += pc;
    if ((pc >= 0.5 ? 1 : 0) === y) correct += 1;
  }

  return {
    brier: Number((brier / n).toFixed(6)),
    log_loss: Number((logLoss / n).toFixed(6)),
    accuracy: Number((correct / n).toFixed(4)),
    avg_prob: Number((avgProb / n).toFixed(4)),
  };
}

function calibrationBuckets(probs: number[], labels: number[], buckets = 10): Bucket[] {
  const counts = Array.from({ length: buckets }, () => 0);
  const pSums = Array.from({ length: buckets }, () => 0);
  const ySums = Array.from({ length: buckets }, () => 0);

  for (let i = 0; i < probs.length; i += 1) {
    const p = probs[i]!;
    const y = labels[i]!;
    const idx = Math.min(buckets - 1, Math.floor(p * buckets));
    counts[idx] += 1;
    pSums[idx] += p;
    ySums[idx] += y;
  }

  const out: Bucket[] = [];
  for (let i = 0; i < buckets; i += 1) {
    if (counts[i] === 0) continue;
    out.push({
      index: i,
      count: counts[i],
      avg_prob: Number((pSums[i] / counts[i]).toFixed(4)),
      home_win_rate: Number((ySums[i] / counts[i]).toFixed(4)),
    });
  }
  return out;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      split: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    process.stdout.write("Usage: npm run eval [-- --file data/results.csv --split 0.8]\n");
    return;
  }

  const file = values.file ?? DEFAULT_FILE;
  if (!existsSync(file)) {
    throw new Error(`CSV not found: ${file}`);
  }

  const split = Number(values.split ?? "0.8");
  if (!Number.isFinite(split) || split <= 0.5 || split >= 0.95) {
    throw new Error(`--split must be between 0.5 and 0.95, got ${values.split ?? "0.8"}`);
  }

  const rows = await readRows(file);
  if (rows.length < 500) {
    throw new Error(`Not enough canonical WC rows to evaluate: ${rows.length}`);
  }

  const splitIdx = Math.floor(rows.length * split);
  const trainRows = rows.slice(0, splitIdx);
  const testRows = rows.slice(splitIdx);

  const ratings = new Map<Wc2026Team, number>();
  const h2h = new Map<string, { home_wins: number; away_wins: number; draws: number; total: number }>();
  const chunks: PlaybookChunk[] = [];

  for (const r of trainRows) {
    updateState(ratings, h2h, chunks, r);
  }

  const squad = loadSquadValues();

  const labels: number[] = [];
  const pCoin: number[] = [];
  const pElo: number[] = [];
  const pEloH2h: number[] = [];
  const pRagBlend: number[] = [];
  const pFactors: number[] = [];

  for (const r of testRows) {
    const y = r.homeScore > r.awayScore ? 1 : 0;
    const rHome = ratings.get(r.home) ?? DEFAULT_ELO;
    const rAway = ratings.get(r.away) ?? DEFAULT_ELO;

    // P(home win): home rating (+ home advantage) vs away rating.
    const pEloOnly = clampProb(expectedScore(rHome + HOME_ADVANTAGE_ELO, rAway));
    const pModel = clampProb(pEloOnly + h2hAdjustment(h2h, r.home, r.away));
    const hits = searchPlaybookChunks(chunks, r.home, r.away, 6);
    const pBlend = blendEloWithRag(pModel, hits, r.home, r.away) ?? pModel;

    // Factor-augmented: fold form + squad-value Elo delta into home advantage.
    const delta = factorEloDelta(squad, r.home, r.away);
    const pEloFactor = clampProb(
      expectedScore(rHome + HOME_ADVANTAGE_ELO + delta, rAway),
    );
    const pFactor = clampProb(pEloFactor + h2hAdjustment(h2h, r.home, r.away));

    labels.push(y);
    pCoin.push(0.5);
    pElo.push(pEloOnly);
    pEloH2h.push(pModel);
    pRagBlend.push(pBlend);
    pFactors.push(pFactor);

    updateState(ratings, h2h, chunks, r);
  }

  const metrics = {
    coin_flip: finalizeMetrics(pCoin, labels),
    elo: finalizeMetrics(pElo, labels),
    elo_h2h: finalizeMetrics(pEloH2h, labels),
    rag_elo_blend: finalizeMetrics(pRagBlend, labels),
    elo_factors: finalizeMetrics(pFactors, labels),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const out = {
    built_at: new Date().toISOString(),
    source: file,
    split,
    counts: {
      rows_total: rows.length,
      rows_train: trainRows.length,
      rows_test: testRows.length,
    },
    metrics,
    calibration: {
      rag_elo_blend: calibrationBuckets(pRagBlend, labels, 10),
      elo_factors: calibrationBuckets(pFactors, labels, 10),
    },
    notes: [
      "Outcome is binary: home win (1) vs not home win (0).",
      "Walk-forward evaluation updates ratings/history after each test match.",
      "elo_factors adds exponentially-weighted recent form + squad market value.",
      "rest-days and injuries are live-only signals (no historical record) and are excluded here.",
      "LLM output is not included in this offline benchmark.",
    ],
  };
  writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(out, null, 2));

  process.stdout.write(`\nEvaluation complete (${rows.length} rows; ${testRows.length} test).\n`);
  process.stdout.write("Model           Brier     LogLoss   Accuracy\n");
  process.stdout.write("---------------------------------------------\n");
  process.stdout.write(
    `coin_flip       ${metrics.coin_flip.brier.toFixed(4)}   ${metrics.coin_flip.log_loss.toFixed(4)}   ${(metrics.coin_flip.accuracy * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `elo             ${metrics.elo.brier.toFixed(4)}   ${metrics.elo.log_loss.toFixed(4)}   ${(metrics.elo.accuracy * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `elo_h2h         ${metrics.elo_h2h.brier.toFixed(4)}   ${metrics.elo_h2h.log_loss.toFixed(4)}   ${(metrics.elo_h2h.accuracy * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `rag_elo_blend   ${metrics.rag_elo_blend.brier.toFixed(4)}   ${metrics.rag_elo_blend.log_loss.toFixed(4)}   ${(metrics.rag_elo_blend.accuracy * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `elo_factors     ${metrics.elo_factors.brier.toFixed(4)}   ${metrics.elo_factors.log_loss.toFixed(4)}   ${(metrics.elo_factors.accuracy * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(`\nSaved: ${join("data", "evals", "latest.json")}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
