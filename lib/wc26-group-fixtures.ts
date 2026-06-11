import venuesData from "@/data/wc26-match-venues.json";
import type { Fixture } from "@/lib/fixtures";
import type { ParsedWcGame } from "@/lib/polymarket-gamma";
import { canonicalizeTeam } from "@/lib/teams";
import { kickoffDateUtc } from "@/lib/wc26-schedule";

type VenueRow = {
  home: string;
  away: string;
  date: string;
  location: string;
  city: string;
  group?: string;
  match_number?: number;
};

function fixtureKey(home: string, away: string, date: string): string {
  return `${home}|${away}|${date}`;
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

/** All 72 WC26 group-stage fixtures from official schedule, with Polymarket odds when matched. */
export function loadGroupStageFixtures(polymarketGames: ParsedWcGame[] = []): Fixture[] {
  const poly = indexPolymarketGames(polymarketGames);
  const rows = (venuesData.matches as VenueRow[]).filter((r) => r.group);

  const fixtures: Fixture[] = [];
  for (const row of rows) {
    const home = canonicalizeTeam(row.home);
    const away = canonicalizeTeam(row.away);
    if (!home || !away) continue;

    const key = fixtureKey(home, away, row.date);
    const game = poly.get(key);
    const kickoff_iso = game?.kickoff_iso ?? `${row.date}T19:00:00Z`;

    fixtures.push({
      id: `gs-${String(row.match_number ?? fixtures.length + 1).padStart(2, "0")}-${row.date}`,
      home,
      away,
      kickoff_iso,
      competition: `FIFA World Cup · ${row.group}`,
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

export const GROUP_STAGE_MATCH_COUNT = (venuesData.matches as VenueRow[]).filter(
  (r) => r.group,
).length;
