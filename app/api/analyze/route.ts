import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeMatch } from "@/lib/alpha-engine";
import { canonicalizeTeam } from "@/lib/teams";

export const runtime = "nodejs";
export const maxDuration = 60;

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateMap = new Map<string, RateEntry>();

function rateWindowMs(): number {
  const raw = process.env.ANALYZE_RATE_LIMIT_WINDOW_MS?.trim();
  const n = raw ? Number(raw) : 60_000;
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

function rateMax(): number {
  const raw = process.env.ANALYZE_RATE_LIMIT_MAX?.trim();
  const n = raw ? Number(raw) : 20;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  return forwarded || real || cf || "unknown";
}

function checkRateLimit(ip: string): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = rateWindowMs();
  const max = rateMax();
  const prev = rateMap.get(ip);

  if (!prev || prev.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  if (prev.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((prev.resetAt - now) / 1000)) };
  }

  prev.count += 1;
  rateMap.set(ip, prev);
  return { ok: true, remaining: max - prev.count };
}

const BodySchema = z.object({
  home: z.string().min(1),
  away: z.string().min(1),
  kickoff_iso: z.string().min(8),
  competition: z.string().optional(),
  p_market: z.number().gt(0).lt(1).optional().nullable(),
  market_draw: z.number().gt(0).lt(1).optional().nullable(),
  market_away_win: z.number().gt(0).lt(1).optional().nullable(),
  polymarket_market_slug: z.string().optional().nullable(),
  polymarket_event_slug: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  is_world_cup: z.boolean().optional(),
  include_llm: z.boolean().optional(),
  include_sentiment: z.boolean().optional(),
  refresh_sentiment: z.boolean().optional(),
});

/** POST /api/analyze — Elo + RAG + sentiment + LLM vs Polymarket */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again shortly.",
        retry_after_sec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec),
        },
      },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const home = canonicalizeTeam(parsed.data.home);
  const away = canonicalizeTeam(parsed.data.away);
  if (!home || !away) {
    return NextResponse.json(
      {
        error: "Unknown team name(s). Use canonical WC 2026 national team names.",
        home: parsed.data.home,
        away: parsed.data.away,
      },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeMatch(
      {
        home,
        away,
        kickoff_iso: parsed.data.kickoff_iso,
        competition: parsed.data.competition,
        p_market: parsed.data.p_market ?? undefined,
        market_draw: parsed.data.market_draw ?? undefined,
        market_away_win: parsed.data.market_away_win ?? undefined,
        polymarket_event_slug:
          parsed.data.polymarket_event_slug ??
          parsed.data.polymarket_market_slug ??
          undefined,
        polymarket_market_slug: parsed.data.polymarket_market_slug ?? undefined,
        venue: parsed.data.venue ?? undefined,
        city: parsed.data.city ?? undefined,
        is_world_cup: parsed.data.is_world_cup,
      },
      {
        includeLlm: parsed.data.include_llm,
        includeSentiment: parsed.data.include_sentiment,
        refreshSentiment: parsed.data.refresh_sentiment,
      },
    );
    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
