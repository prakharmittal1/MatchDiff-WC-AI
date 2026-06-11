import type { AnalyzeResult } from "@/lib/alpha-types";
import type { Fixture } from "@/lib/fixtures";

export function buildAnalyzeRequestBody(f: Fixture) {
  return {
    home: f.home,
    away: f.away,
    kickoff_iso: f.kickoff_iso,
    competition: f.competition,
    p_market:
      f.market_price_source === "polymarket" ? f.market_home_win : undefined,
    market_draw: f.market_draw ?? undefined,
    market_away_win: f.market_away_win ?? undefined,
    polymarket_event_slug:
      f.polymarket_event_slug ?? f.polymarket_market_slug ?? undefined,
    polymarket_market_slug: f.polymarket_market_slug,
    venue: f.venue,
    is_world_cup: f.is_world_cup ?? true,
    include_sentiment: true,
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
