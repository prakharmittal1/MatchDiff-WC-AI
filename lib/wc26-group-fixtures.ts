import venuesData from "@/data/wc26-match-venues.json";
import type { Fixture } from "@/lib/fixtures";
import type { ParsedWcGame } from "@/lib/polymarket-gamma";
import { canonicalizeTeam } from "@/lib/teams";
import { kickoffDateUtc } from "@/lib/wc26-schedule";

type VenueRow = {
  home: string;
  away: string;
  date: string;
  kickoff_iso?: string;
  location: string;
  city: string;
  group?: string;
  round?: string;
  match_number?: number;
};

function fixtureKey(home: string, away: string, date: string): string {
  return `${home}|${away}|${date}`;
}

function polyLookupKey(home: string, away: string, date: string): string | null {
  const h = canonicalizeTeam(home);
  const a = canonicalizeTeam(away);
  if (!h || !a) return null;
  return fixtureKey(h, a, date);
}

export function indexPolymarketGames(games: ParsedWcGame[]): Map<string, ParsedWcGame> {
  const map = new Map<string, ParsedWcGame>();
  for (const g of games) {
    const date = kickoffDateUtc(g.kickoff_iso);
    if (!date) continue;
    map.set(fixtureKey(g.home, g.away, date), g);
  }
  return map;
}

function competitionLabel(row: VenueRow): string {
  if (row.group) return `FIFA World Cup · ${row.group}`;
  if (row.round) return `FIFA World Cup · ${row.round}`;
  return "FIFA World Cup";
}

function fixtureId(row: VenueRow, index: number): string {
  const n = String(row.match_number ?? index + 1).padStart(2, "0");
  const stage = row.group ? "gs" : "ko";
  return `${stage}-${n}-${row.date}`;
}

/** All WC26 schedule fixtures (group stage + knockout), with Polymarket odds when matched. */
export function loadWc26Fixtures(polymarketGames: ParsedWcGame[] = []): Fixture[] {
  const poly = indexPolymarketGames(polymarketGames);
  const rows = venuesData.matches as VenueRow[];

  const fixtures: Fixture[] = [];
  for (const row of rows) {
    const polyKey = polyLookupKey(row.home, row.away, row.date);
    const game = polyKey ? poly.get(polyKey) : undefined;
    const kickoff_iso = game?.kickoff_iso ?? row.kickoff_iso ?? `${row.date}T19:00:00Z`;

    fixtures.push({
      id: fixtureId(row, fixtures.length),
      home: row.home,
      away: row.away,
      kickoff_iso,
      competition: competitionLabel(row),
      venue: row.city,
      market_home_win: game ? Number(game.prices.home.toFixed(4)) : 0.5,
      market_draw: game ? Number(game.prices.draw.toFixed(4)) : null,
      market_away_win: game ? Number(game.prices.away.toFixed(4)) : null,
      market_three_way: game?.prices ?? null,
      market_price_source: game ? "polymarket" : "none",
      polymarket_event_slug: game?.event_slug ?? null,
      polymarket_market_slug: game?.event_slug ?? null,
      is_world_cup: true,
    });
  }

  fixtures.sort((a, b) => {
    const ta = Date.parse(a.kickoff_iso);
    const tb = Date.parse(b.kickoff_iso);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  return fixtures;
}

/** @deprecated Use loadWc26Fixtures */
export const loadGroupStageFixtures = loadWc26Fixtures;

export const GROUP_STAGE_MATCH_COUNT = (venuesData.matches as VenueRow[]).filter(
  (r) => r.group,
).length;

export const KNOCKOUT_MATCH_COUNT = (venuesData.matches as VenueRow[]).filter(
  (r) => r.round,
).length;

export const WC26_MATCH_COUNT = venuesData.match_count;
