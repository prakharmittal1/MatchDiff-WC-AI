import "server-only";

import type {
  AnalyzeMatchInput,
  AnalyzeResult,
  ExpectedSource,
} from "@/lib/alpha-types";
import { classifySignal, computeEv } from "@/lib/ev";
import {
  getTeamElo,
  h2hAdjustment,
  homeWinProbability,
  loadEloRatings,
  clampProbability,
  HOME_ADVANTAGE_ELO,
} from "@/lib/elo";
import { generateAnalystInsight, isLlmAnalystConfigured } from "@/lib/llm-analyst";
import {
  combineFactors,
  injuryFactor,
  recentFormFactor,
  restAsymmetryFactor,
  squadValueFactor,
} from "@/lib/model-factors";
import { recentFormFor } from "@/lib/recent-form";
import { restDaysForFixture } from "@/lib/rest-days";
import { kickoffDateUtc } from "@/lib/wc26-schedule";
import { quoteHomeMoneylineYes } from "@/lib/polymarket-prices";
import { isRagAvailable, searchRagForMatch } from "@/lib/rag";
import { blendEloWithRag } from "@/lib/rag-form";
import { resolveMatchContext } from "@/lib/match-context";
import { buildMismatchVerdict } from "@/lib/mismatch-verdict";
import type { ThreeWayPrices } from "@/lib/polymarket-gamma";
import {
  gatherMatchSentiment,
  isSentimentConfigured,
} from "@/lib/sentiment/gather";

function buildMarketBlock(
  slug: string | null,
  source: AnalyzeResult["market"]["source"],
  question: string | null,
  p_market: number | null,
  threeWay: ThreeWayPrices | null | undefined,
  input: AnalyzeMatchInput,
): AnalyzeResult["market"] {
  return {
    slug,
    source,
    question,
    home_win: p_market,
    draw:
      threeWay?.draw ??
      (input.market_draw != null && Number.isFinite(input.market_draw)
        ? input.market_draw
        : null),
    away_win:
      threeWay?.away ??
      (input.market_away_win != null && Number.isFinite(input.market_away_win)
        ? input.market_away_win
        : null),
  };
}

function computeMarketEdge(p_expected: number, p_market: number | null) {
  const edge = p_market !== null ? p_expected - p_market : null;
  const signal = edge !== null ? classifySignal(edge) : ("NONE" as const);
  let ev_per_unit: number | null = null;
  if (p_market !== null && edge !== null) {
    const side = signal === "ALPHA_NO" ? "no" : "yes";
    ev_per_unit = computeEv({ p_true: p_expected, p_market, side }).ev;
  }
  return {
    edge: edge !== null ? Number(edge.toFixed(4)) : null,
    signal,
    ev_per_unit,
  };
}

function buildAnalyzeCore(args: {
  input: AnalyzeMatchInput;
  p_market: number | null;
  p_model: number;
  p_expected: number;
  p_expected_source: ExpectedSource;
  elo_home: number;
  elo_away: number;
  h2h_adj: number;
  base_p_home: number;
  adjustments: AnalyzeResult["adjustments"];
  marketSlug: string | null;
  marketSource: AnalyzeResult["market"]["source"];
  marketQuestion: string | null;
  marketThreeWay: ThreeWayPrices | null | undefined;
  data_gaps: string[];
  match_context: AnalyzeResult["match_context"];
  rag: AnalyzeResult["rag"];
  sentiment: AnalyzeResult["sentiment"];
  elo_built_at: string;
}): Omit<AnalyzeResult, "llm" | "verdict"> {
  return {
    match: {
      home: args.input.home,
      away: args.input.away,
      kickoff_iso: args.input.kickoff_iso,
      competition: args.input.competition ?? "Match",
    },
    p_market: args.p_market,
    p_model: Number(args.p_model.toFixed(4)),
    p_expected: Number(args.p_expected.toFixed(4)),
    p_expected_source: args.p_expected_source,
    ...computeMarketEdge(args.p_expected, args.p_market),
    breakdown: {
      elo_home: args.elo_home,
      elo_away: args.elo_away,
      home_advantage: HOME_ADVANTAGE_ELO,
      h2h_adjustment: Number(args.h2h_adj.toFixed(4)),
      base_p_home: Number(args.base_p_home.toFixed(4)),
    },
    adjustments: args.adjustments,
    market: buildMarketBlock(
      args.marketSlug,
      args.marketSource,
      args.marketQuestion,
      args.p_market,
      args.marketThreeWay,
      args.input,
    ),
    data_gaps: args.data_gaps,
    match_context: args.match_context,
    rag: args.rag,
    sentiment: args.sentiment,
    elo_built_at: args.elo_built_at,
  };
}

export type AnalyzeMatchOptions = {
  /** Default true when an LLM provider is configured. */
  includeLlm?: boolean;
  /** Default true when news sources are configured. */
  includeSentiment?: boolean;
  /** Bypass sentiment file/memory cache (e.g. refresh headlines). */
  refreshSentiment?: boolean;
};

export async function analyzeMatch(
  input: AnalyzeMatchInput,
  options: AnalyzeMatchOptions = {},
): Promise<AnalyzeResult> {
  const includeLlm = options.includeLlm !== false && isLlmAnalystConfigured();
  const includeSentiment =
    options.includeSentiment !== false && isSentimentConfigured();

  const ratings = loadEloRatings();
  const data_gaps: string[] = [];

  const elo_home = getTeamElo(input.home, ratings);
  const elo_away = getTeamElo(input.away, ratings);
  const h2h_adj = h2hAdjustment(input.home, input.away);
  const base_p_home = homeWinProbability(input.home, input.away, { ratings });

  if (ratings.source === "seed-ratings" || ratings.source === "inline-default") {
    data_gaps.push(
      "Using starter team ratings; run `npm run data:build -- --file data/results.csv` for fuller history",
    );
  }

  const rag = searchRagForMatch(input.home, input.away, 6);
  const match_context = resolveMatchContext({
    home: input.home,
    away: input.away,
    kickoff_iso: input.kickoff_iso,
    competition: input.competition,
    venue: input.venue,
    city: input.city,
    is_world_cup: input.is_world_cup,
  });
  if (!isRagAvailable()) {
    data_gaps.push("No RAG chunks; run `npm run data:build -- --file data/results.csv`");
  }

  let sentiment = null;
  if (includeSentiment) {
    try {
      sentiment = await gatherMatchSentiment(input.home, input.away, input.kickoff_iso, {
        useCache: !options.refreshSentiment,
      });
      if (sentiment && sentiment.post_count === 0) {
        const errors = sentiment.sources
          .filter((s) => s.status === "error")
          .map((s) => s.detail)
          .filter(Boolean);
        if (errors.length > 0) {
          data_gaps.push(`Social buzz: ${errors[0]}`);
        } else {
          data_gaps.push("No recent news headlines for this match");
        }
      }
    } catch {
      data_gaps.push("Sentiment lookup failed");
    }
  }

  const kickoffDate = kickoffDateUtc(input.kickoff_iso) ?? input.kickoff_iso.slice(0, 10);
  const { homeRestDays, awayRestDays } = restDaysForFixture(
    input.home,
    input.away,
    kickoffDate,
  );
  const adjustments = combineFactors([
    restAsymmetryFactor({
      homeTeam: input.home,
      awayTeam: input.away,
      homeRestDays,
      awayRestDays,
    }),
    recentFormFactor(
      input.home,
      input.away,
      recentFormFor(input.home),
      recentFormFor(input.away),
    ),
    squadValueFactor(input.home, input.away),
    injuryFactor(input.home, input.away, sentiment?.injury_reports ?? []),
  ]);

  // Fold the combined Elo delta into the win-probability baseline.
  const adjusted_p_home = homeWinProbability(input.home, input.away, {
    ratings,
    homeAdvantage: HOME_ADVANTAGE_ELO + adjustments.total_elo_delta,
  });
  const p_model = clampProbability(adjusted_p_home + h2h_adj);

  let p_market: number | null =
    input.p_market != null && Number.isFinite(input.p_market) ? input.p_market : null;
  let marketSlug = input.polymarket_market_slug ?? null;
  let marketSource: AnalyzeResult["market"]["source"] =
    p_market !== null ? "client" : "none";
  let marketQuestion: string | null = null;
  let marketThreeWay: ThreeWayPrices | null | undefined;

  if (
    p_market !== null &&
    input.market_draw != null &&
    input.market_away_win != null
  ) {
    marketThreeWay = {
      home: p_market,
      draw: input.market_draw,
      away: input.market_away_win,
    };
    marketSource = "client";
  }

  try {
    const quote = await quoteHomeMoneylineYes(input.home, input.away, input.kickoff_iso, {
      eventSlug: input.polymarket_event_slug ?? input.polymarket_market_slug,
    });
    if (quote?.price !== undefined && Number.isFinite(quote.price)) {
      p_market = quote.price;
      marketSource = "polymarket";
      marketSlug = quote.event_slug ?? quote.market_slug ?? marketSlug;
      marketQuestion = quote.market_question ?? null;
      marketThreeWay = quote.three_way ?? marketThreeWay;
    }
  } catch {
    data_gaps.push("Polymarket Gamma lookup failed");
  }

  if (p_market === null) {
    data_gaps.push("No Polymarket match odds found for this fixture");
  }

  let p_expected = p_model;
  let p_expected_source: ExpectedSource = "elo";

  const ragBlend = blendEloWithRag(p_model, rag.hits, input.home, input.away);
  if (ragBlend !== null) {
    p_expected = ragBlend;
    p_expected_source = "rag_elo_blend";
  }

  let llm = null;

  const coreArgs = {
    input,
    p_market,
    p_model,
    p_expected,
    p_expected_source,
    elo_home,
    elo_away,
    h2h_adj,
    base_p_home,
    adjustments,
    marketSlug,
    marketSource,
    marketQuestion,
    marketThreeWay,
    data_gaps,
    match_context,
    rag,
    sentiment,
    elo_built_at: ratings.built_at,
  };

  if (includeLlm) {
    const { insight } = await generateAnalystInsight(buildAnalyzeCore(coreArgs));
    if (insight) {
      p_expected = insight.p_expected_home_win;
      p_expected_source = "llm";
      llm = insight;
    } else if (p_expected_source === "elo" && rag.hits.length > 0) {
      data_gaps.push(
        "LLM unavailable; using team ratings only (enable Ollama or Gemini for richer analysis)",
      );
    }
  }

  p_expected = Number(p_expected.toFixed(4));

  const partial = buildAnalyzeCore({
    ...coreArgs,
    p_expected,
    p_expected_source,
    data_gaps,
  });

  const withLlm = { ...partial, llm };
  return {
    ...withLlm,
    verdict: buildMismatchVerdict(withLlm),
  };
}

