import type { AnalyzeResult } from "@/lib/alpha-types";
import type { Fixture } from "@/lib/fixtures";

export function buildAnalyzeRequestBody(f: Fixture) {
  const isDemo = f.market_price_source === "fifa-rank";
  const hasTileMarket =
    f.market_price_source === "polymarket" || f.market_price_source === "fifa-rank";

  return {
    home: f.home,
    away: f.away,
    kickoff_iso: f.kickoff_iso,
    competition: f.competition,
    p_market: hasTileMarket ? f.market_home_win : undefined,
    market_draw: hasTileMarket ? (f.market_draw ?? undefined) : undefined,
    market_away_win: hasTileMarket ? (f.market_away_win ?? undefined) : undefined,
    market_price_source: f.market_price_source ?? "none",
    polymarket_event_slug: isDemo
      ? undefined
      : (f.polymarket_event_slug ?? f.polymarket_market_slug ?? undefined),
    polymarket_market_slug: isDemo ? undefined : f.polymarket_market_slug,
    venue: f.venue,
    is_world_cup: f.is_world_cup ?? true,
    // Archive / closed markets: no live news scrape.
    include_sentiment: !isDemo,
  };
}

function errorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return `Request failed (${status})`;
}

export async function requestMatchAnalysis(f: Fixture): Promise<AnalyzeResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildAnalyzeRequestBody(f)),
  });

  const data: unknown = await res.json();
  if (!res.ok) {
    throw new Error(errorMessage(data, res.status));
  }

  return data as AnalyzeResult;
}
