import "server-only";

import { z } from "zod";

import type { AnalyzeResult, LlmInsight } from "@/lib/alpha-types";
import {
  llmCacheKey,
  readFileLlmCache,
  readMemoryLlmCache,
  writeLlmCache,
} from "@/lib/llm-cache";
import {
  generateObject,
  getResolvedLlm,
  isLlmAnalystConfigured,
  isOllamaReachable,
} from "@/lib/llm-provider";
import { log } from "@/lib/log";
import { isIncompleteInjuryFragment } from "@/lib/sentiment/injury-text";

const InsightSchema = z.object({
  p_expected_home_win: z
    .number()
    .min(0.05)
    .max(0.95)
    .describe(
      "Your fair probability that the HOME team wins. Synthesize the stats baseline, every past-meeting row, and football judgment. Do not copy the baseline verbatim unless history fully agrees.",
    ),
  headline: z
    .string()
    .describe("One punchy plain-English sentence a casual fan understands. No jargon, no numbers like 0.88."),
  thinking_steps: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe(
      "Plain-English reasoning steps for a casual fan. Talk about team strength, recent form, past meetings, venue/altitude/travel, injuries. NEVER use model jargon (no 'Elo', 'p_model', 'p_expected', 'baseline probability', or raw decimals like 0.88). Use percentages in words if needed (e.g. 'about 80%').",
    ),
  stance: z
    .enum(["agree", "disagree", "cautious"])
    .describe(
      "Vs the betting market: agree = your number shows a real edge; disagree = market looks right; cautious = edge exists but uncertain.",
    ),
  summary: z
    .string()
    .min(1)
    .describe("2–4 plain-English sentences giving your final view. No jargon or raw decimals. Always write a real summary; never say 'no summary'."),
  risks: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Concrete, plain-English risks (injuries, fatigue, conditions, upset potential). No model jargon."),
  trade_idea: z
    .string()
    .nullable()
    .describe("Plain-English bet suggestion on the first-listed team vs the market, or null. No jargon."),
});

const InsightLooseSchema = z.object({
  p_expected_home_win: z.number().min(0).max(1).optional(),
  headline: z.string().optional(),
  thinking_steps: z.array(z.string()).optional(),
  stance: z.enum(["agree", "disagree", "cautious"]).optional(),
  summary: z.string().optional(),
  risks: z.array(z.string()).optional(),
  trade_idea: z.string().nullable().optional(),
});

export { isLlmAnalystConfigured };

type QuantForLlm = Omit<AnalyzeResult, "verdict" | "llm">;

function buildPrompt(quant: QuantForLlm): string {
  return [
    "You are a World Cup 2026 prediction-market analyst.",
    "This is FIFA World Cup 2026 in the United States, Mexico, and Canada — there is NO home or away team; fixture order is arbitrary.",
    "All teams are based in host cities across North America; mention venue city, altitude, heat, and travel between host cities — not home advantage.",
    "Produce p_expected_home_win: your fair probability the FIRST-LISTED team in the fixture wins.",
    "",
    "Inputs you MUST use:",
    "1. p_model — Elo + head-to-head baseline (anchor, not gospel).",
    "2. historical_context — keyword RAG rows; weight recent H2H and World Cup results heavily.",
    "3. p_market — Polymarket YES price for the first-listed team to win (if null, ignore market comparison).",
    "4. match_conditions — venue, altitude, heat/humidity, air quality, travel, jet lag; use ONLY facts listed there.",
    "4b. quant_adjustments — rest, recent form, squad value, injuries (already in p_model). Do NOT double-count; reference them in thinking_steps.",
    "5. news_sentiment — recent headlines + injury_reports (if null or empty, ignore).",
    "   Weight injury_reports heavily vs Elo when adjusting p_expected; cite squad availability in thinking_steps and risks.",
    "   Do NOT invent headlines, players, or injury statuses not listed in news_sentiment.",
    "",
    "Rules:",
    "- Output p_expected_home_win in [0.05, 0.95].",
    "- If RAG shows the first-listed team dominated recent meetings, nudge above p_model; if the second team dominated, nudge below.",
    "- At high altitude (e.g. Mexico City ~2,240 m), nudge toward teams better suited per match_conditions; mention in risks.",
    "- Factor heat/humidity, cooling-break conditions, altitude, air quality, and jet lag when match_conditions notes them.",
    "- Do NOT invent scores not listed in historical_context.",
    "- Do NOT invent venue facts not in match_conditions.",
    "- Do NOT invent headlines or themes not in news_sentiment.",
    "- If injury_reports lists ruled_out or doubtful players, nudge against that team unless RAG strongly disagrees.",
    "- stance compares YOUR p_expected_home_win to p_market (not the old elo-only edge).",
    "",
    "OUTPUT STYLE (applies to headline, thinking_steps, summary, risks, trade_idea):",
    "- Write for a casual fan who knows football but not statistics.",
    "- NEVER use internal jargon: no 'Elo', 'Elo points', 'p_model', 'p_expected', 'p_expected_home_win', 'p_market', 'baseline probability', 'quant_adjustments', 'RAG', 'historical_context'.",
    "- NEVER print raw decimals like 0.8838 or '0.88'. If you mention a chance, write it as a rounded percentage in words, e.g. 'about 80%' or 'roughly 4 in 5'.",
    "- Instead of variable names use plain phrases: 'our model', 'team ratings', 'recent form', 'past meetings', 'the betting market', 'the odds'.",
    "- NEVER say 'home team', 'away team', or 'home advantage'. Say 'first-listed team' or use country names.",
    "- Be direct; one short sentence per thinking_step.",
    "- summary must always be a real 2–4 sentence read. Never output 'No summary' or leave it blank.",
    "",
    "historical_context (RAG):",
    JSON.stringify(quant.rag.hits, null, 2),
    "",
    "match_conditions (venue / altitude / travel):",
    JSON.stringify(quant.match_context, null, 2),
    "",
    "quant_adjustments (already folded into p_model — rest, form, squad value, injuries; Elo points, first-listed team perspective):",
    JSON.stringify(quant.adjustments, null, 2),
    "",
    "news_sentiment (headlines + injury_reports):",
    JSON.stringify(quant.sentiment, null, 2),
    "",
    "Quant baseline (JSON):",
    JSON.stringify(
      {
        match: quant.match,
        p_model: quant.p_model,
        p_market: quant.p_market,
        breakdown: quant.breakdown,
        market: quant.market,
        market_three_way: {
          home: quant.market.home_win,
          draw: quant.market.draw,
          away: quant.market.away_win,
        },
        data_gaps: quant.data_gaps,
      },
      null,
      2,
    ),
  ].join("\n");
}

function fallbackSentences(text: string, limit: number): string[] {
  const bits = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return bits.slice(0, limit);
}

/**
 * Safety net for model text that leaks internal jargon despite the prompt.
 * Rewrites variable names to plain language and turns raw decimals that look
 * like probabilities (0.88) into rounded percentages (about 88%).
 */
function plainLanguage(text: string): string {
  let out = text;
  out = out.replace(/\bp[_ ]?expected(?:[_ ]home[_ ]win)?\b/gi, "our estimate");
  out = out.replace(/\bp[_ ]?model\b/gi, "our model");
  out = out.replace(/\bp[_ ]?market\b/gi, "the betting market");
  out = out.replace(/\bbaseline probability\b/gi, "our model");
  out = out.replace(/\bquant[_ ]adjustments?\b/gi, "the adjustments");
  out = out.replace(/\bhistorical[_ ]context\b/gi, "past meetings");
  out = out.replace(/\bElo(?:[ -]?points?| ratings?| score)?\b/gi, "team ratings");
  out = out.replace(/\bRAG\b/g, "past meetings");
  out = out.replace(/(?:=\s*)?\b0?\.(\d{1,4})\b/g, (_m, frac: string) => {
    const pct = Math.round(Number(`0.${frac}`) * 100);
    return `about ${pct}%`;
  });
  return out.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
}

function plainSentence(text: string): string | null {
  const cleaned = plainLanguage(text.trim());
  if (!cleaned || isIncompleteInjuryFragment(cleaned)) return null;
  return cleaned;
}

function plainList(items: string[]): string[] {
  return items.map((s) => plainSentence(s)).filter((s): s is string => Boolean(s));
}

function plainSummary(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => plainSentence(s))
    .filter((s): s is string => Boolean(s));
  return sentences.join(" ").trim();
}

function normalizeLooseInsight(
  raw: z.infer<typeof InsightLooseSchema>,
  model: string,
): LlmInsight {
  const p = Number(
    Math.min(0.95, Math.max(0.05, raw.p_expected_home_win ?? 0.5)).toFixed(4),
  );

  const thinking = plainList(raw.thinking_steps ?? []).slice(0, 6);

  let summary = plainSummary((raw.summary ?? "").trim());
  if (!summary) {
    summary =
      plainSentence((raw.headline ?? "").trim()) ||
      thinking.slice(0, 2).join(" ") ||
      "Our model leans on team ratings and past meetings here; treat it as a lean rather than a lock.";
  }

  const headline =
    plainSentence((raw.headline ?? "").trim()) ||
    fallbackSentences(summary, 1)[0] ||
    "A cautious read on this match.";

  if (thinking.length < 2) {
    const seed = fallbackSentences(summary, 2);
    while (seed.length < 2) {
      seed.push("Limited information here, so we're keeping this read cautious.");
    }
    thinking.push(...seed.slice(0, 2 - thinking.length));
  }

  const risks = plainList(raw.risks ?? []).slice(0, 5);
  if (risks.length === 0) {
    risks.push("Limited information, so treat this read as lower-confidence than usual.");
  }

  return {
    model,
    p_expected_home_win: p,
    headline,
    thinking_steps: thinking,
    stance: raw.stance ?? "cautious",
    summary,
    risks,
    trade_idea: raw.trade_idea?.trim() ? plainSentence(raw.trade_idea.trim()) : null,
  };
}

export async function generateAnalystInsight(
  quant: QuantForLlm,
): Promise<{ insight: LlmInsight | null; skipReason?: string }> {
  const resolved = getResolvedLlm();
  if (!resolved) {
    log.debug("[llm] skipped: no configured provider");
    return { insight: null, skipReason: "no_api_key" };
  }

  log.debug(`[llm] resolved provider/model: ${resolved.displayName}`);
  const prompt = buildPrompt(quant);
  const key = llmCacheKey(resolved.displayName, prompt);
  const mem = readMemoryLlmCache(key);
  if (mem) {
    log.debug(`[llm] cache hit (memory): ${resolved.displayName}`);
    return { insight: mem };
  }
  const file = await readFileLlmCache(key);
  if (file) {
    log.debug(`[llm] cache hit (file): ${resolved.displayName}`);
    return { insight: file };
  }
  log.debug(`[llm] cache miss: ${resolved.displayName}`);

  if (resolved.provider === "ollama") {
    const up = await isOllamaReachable();
    if (!up) {
      log.debug(`[llm] skipped: ollama unreachable for ${resolved.displayName}`);
      return {
        insight: null,
        skipReason:
          "error: Ollama not reachable — run `ollama serve` and `ollama pull " +
          resolved.modelId +
          "`",
      };
    }
  }

  const runLoose = async (): Promise<LlmInsight> => {
    const { object } = await generateObject({
      model: resolved.model,
      schema: InsightLooseSchema,
      temperature: 0.25,
      prompt,
      providerOptions: resolved.providerOptions,
    });
    const normalized = normalizeLooseInsight(object, resolved.displayName);
    await writeLlmCache(key, resolved.displayName, normalized);
    return normalized;
  };

  // Models without json_schema support (e.g. Groq Llama 3.x) always fail the
  // strict attempt — skip straight to the tolerant json_object path.
  if (!resolved.structuredOutputs) {
    try {
      log.debug(`[llm] calling model (loose schema): ${resolved.displayName}`);
      const insight = await runLoose();
      log.debug(`[llm] success + cached: ${resolved.displayName}`);
      return { insight };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.debug(`[llm] failed from ${resolved.displayName}: ${message}`);
      return { insight: null, skipReason: `error: ${message}` };
    }
  }

  try {
    log.debug(`[llm] calling model: ${resolved.displayName}`);
    const { object } = await generateObject({
      model: resolved.model,
      schema: InsightSchema,
      temperature: 0.35,
      prompt,
      providerOptions: resolved.providerOptions,
    });

    const p = Number(Math.min(0.95, Math.max(0.05, object.p_expected_home_win)).toFixed(4));

    const insight: LlmInsight = {
      model: resolved.displayName,
      p_expected_home_win: p,
      headline: plainLanguage(object.headline.trim()),
      thinking_steps: plainList(object.thinking_steps),
      stance: object.stance,
      summary: plainLanguage(object.summary.trim()),
      risks: plainList(object.risks),
      trade_idea: object.trade_idea?.trim() ? plainLanguage(object.trade_idea.trim()) : null,
    };
    await writeLlmCache(key, resolved.displayName, insight);
    log.debug(`[llm] success + cached: ${resolved.displayName}`);
    return { insight };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.debug(`[llm] strict schema error from ${resolved.displayName}: ${message}`);

    // Retry once with a tolerant schema so near-valid outputs still render.
    try {
      log.debug(`[llm] retrying with loose schema: ${resolved.displayName}`);
      const insight = await runLoose();
      log.debug(`[llm] recovered with loose schema + cached: ${resolved.displayName}`);
      return { insight };
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      log.debug(`[llm] retry failed from ${resolved.displayName}: ${retryMessage}`);
      return { insight: null, skipReason: `error: ${retryMessage}` };
    }
  }
}
