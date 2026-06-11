import { readFile } from "node:fs/promises";
import path from "node:path";

import { fetchGoogleNewsRss } from "@/lib/sentiment/google-news-rss";
import { injuryFixtureQuery, injuryTeamQuery, searchTermsForTeam } from "@/lib/sentiment/query";
import { isSoccerOrFootballNews } from "@/lib/sentiment/soccer-filter";
import type { InjuryReport, InjuryStatus } from "@/lib/sentiment/types";
import { canonicalizeTeam, type Wc2026Team } from "@/lib/teams";

const RULED_OUT = /\b(ruled out|will miss|won't play|will not play|out of (the )?tournament)\b/i;
const DOUBTFUL = /\b(doubtful|doubt|sidelined|fitness concern|set to miss|scan|late fitness)\b/i;
const INJURY_HINT = /\b(injur|injured|hamstring|knee|ankle|muscle|strain|fracture|surgery)\b/i;

type CuratedFile = {
  entries?: Array<{
    team: string;
    player?: string;
    status?: string;
    headline: string;
    note?: string;
    url?: string;
    expires_iso?: string;
  }>;
};

function mentionsTeam(text: string, team: Wc2026Team): boolean {
  const lower = text.toLowerCase();
  return searchTermsForTeam(team).some((term) => lower.includes(term.toLowerCase()));
}

export function classifyInjuryStatus(text: string): InjuryStatus {
  if (RULED_OUT.test(text)) return "ruled_out";
  if (DOUBTFUL.test(text)) return "doubtful";
  if (INJURY_HINT.test(text)) return "unknown";
  return "unknown";
}

export function isInjuryHeadline(text: string): boolean {
  return INJURY_HINT.test(text) || RULED_OUT.test(text) || DOUBTFUL.test(text);
}

function cleanPlayerName(name: string): string {
  return name
    .replace(/\s+(ruled out|ruled|injury|injured|doubtful|sidelined|out|for)$/i, "")
    .trim();
}

/** Best-effort player name from common headline patterns. */
export function extractPlayerFromHeadline(title: string, team: Wc2026Team): string | null {
  const teamTerm = searchTermsForTeam(team)[0]!;
  const namePart = `[A-Z][a-z]+(?:[\\w'’.-]*[a-z]+)?(?:\\s+[A-Z][a-z]+(?:[\\w'’.-]*[a-z]+)?){0,2}`;
  const patterns = [
    new RegExp(`${escapeReg(teamTerm)}['’]s\\s+(${namePart})`, "i"),
    new RegExp(`(${namePart})\\s+(?:ruled out|injury|injured|doubtful|sidelined)`, "i"),
    new RegExp(
      `(?:injury|injured|doubt)\\s+(?:for|to)\\s+${escapeReg(teamTerm)}[:\\s-]+(${namePart})`,
      "i",
    ),
  ];

  for (const re of patterns) {
    const m = re.exec(title);
    const name = cleanPlayerName(m?.[1]?.trim() ?? "");
    if (name.length >= 3 && !/^(World|FIFA|Cup|Team|Coach)$/i.test(name)) {
      return name;
    }
  }
  return null;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseHeadlineToReport(
  title: string,
  team: Wc2026Team,
  url?: string,
  at?: string,
  fixture?: { home: Wc2026Team; away: Wc2026Team },
): InjuryReport | null {
  if (!isInjuryHeadline(title) || !mentionsTeam(title, team)) return null;
  if (!isSoccerOrFootballNews(title, fixture)) return null;

  return {
    team,
    player: extractPlayerFromHeadline(title, team),
    status: classifyInjuryStatus(title),
    headline: title.slice(0, 280),
    url,
    source: "news_rss",
    at,
  };
}

function reportKey(r: InjuryReport): string {
  return `${r.team}|${(r.player ?? r.headline).toLowerCase()}|${r.status}`;
}

function dedupeReports(reports: InjuryReport[]): InjuryReport[] {
  const seen = new Set<string>();
  const out: InjuryReport[] = [];
  for (const r of reports) {
    const key = reportKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function loadCuratedInjuries(home: Wc2026Team, away: Wc2026Team): Promise<InjuryReport[]> {
  const filePath = path.join(process.cwd(), "data", "injuries-curated.json");
  let parsed: CuratedFile;
  try {
    const raw = await readFile(filePath, "utf8");
    parsed = JSON.parse(raw) as CuratedFile;
  } catch {
    return [];
  }

  const now = Date.now();
  const teams = new Set([home, away]);
  const out: InjuryReport[] = [];

  for (const entry of parsed.entries ?? []) {
    const team = canonicalizeTeam(entry.team);
    if (!team || !teams.has(team)) continue;
    if (entry.expires_iso && Date.parse(entry.expires_iso) < now) continue;

    const status = normalizeStatus(entry.status);
    out.push({
      team,
      player: entry.player?.trim() || null,
      status,
      headline: entry.headline.trim(),
      url: entry.url,
      source: "curated",
      at: entry.expires_iso,
      note: entry.note?.trim(),
    });
  }

  return out;
}

function normalizeStatus(raw?: string): InjuryStatus {
  const s = raw?.trim().toLowerCase();
  if (s === "ruled_out" || s === "out") return "ruled_out";
  if (s === "doubtful" || s === "doubt") return "doubtful";
  if (s === "fit" || s === "available") return "fit";
  return "unknown";
}

export async function fetchInjuryReports(
  home: Wc2026Team,
  away: Wc2026Team,
): Promise<InjuryReport[]> {
  const curated = await loadCuratedInjuries(home, away);

  const [fixtureFeed, homeFeed, awayFeed] = await Promise.all([
    fetchGoogleNewsRss(home, away, injuryFixtureQuery(home, away)),
    fetchGoogleNewsRss(home, away, injuryTeamQuery(home)),
    fetchGoogleNewsRss(home, away, injuryTeamQuery(away)),
  ]);

  const parsed: InjuryReport[] = [];
  const fixture = { home, away };
  for (const feed of [fixtureFeed, homeFeed, awayFeed]) {
    for (const item of feed.items) {
      const title = item.title ?? item.text;
      for (const team of [home, away] as const) {
        const report = parseHeadlineToReport(title, team, item.url, item.at, fixture);
        if (report) parsed.push(report);
      }
    }
  }

  return dedupeReports([...curated, ...parsed]).slice(0, 10);
}
