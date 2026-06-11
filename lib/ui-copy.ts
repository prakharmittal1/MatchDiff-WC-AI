import type { InjuryStatus, SentimentTone } from "@/lib/sentiment/types";

const NA = "—";

/** Strip internal rating jargon from user-facing strings. */
export function plainEnglish(text: string): string {
  return text
    .replace(/\bElo-only expected\b/gi, "team ratings only")
    .replace(/\bElo(?:[ -]?points?| ratings?| score)?\b/gi, "team ratings")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Show a probability as a whole number percent (e.g. 64%). */
export function formatChance(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return NA;
  return `${Math.round(p * 100)}%`;
}

/** Signed gap vs market (e.g. +18%). */
export function formatGap(edge: number | null | undefined): string {
  if (edge == null || !Number.isFinite(edge)) return NA;
  const pts = Math.round(edge * 100);
  return pts >= 0 ? `+${pts}%` : `${pts}%`;
}

/** Gap badge for verdict card (percentage points as %). */
export function formatGapBadge(gapPp: number | null | undefined): string | null {
  if (gapPp == null || !Number.isFinite(gapPp)) return null;
  return gapPp >= 0 ? `+${gapPp}%` : `${gapPp}%`;
}

/** One-line verdict vs betting market (first-listed team in the fixture). */
export function marketVerdictLine(
  kind: "underpriced" | "overpriced" | "aligned" | "no_market",
  team: string,
): string {
  switch (kind) {
    case "underpriced":
      return `Our win estimate for ${team} is higher than the market`;
    case "overpriced":
      return `Our win estimate for ${team} is lower than the market`;
    case "aligned":
      return `Our estimate matches the market on ${team}`;
    case "no_market":
      return "No betting odds yet";
  }
}

/** UI-only labels; API model IDs stay unchanged. */
const LLM_MODEL_DISPLAY_ALIASES: Record<string, string> = {
  "groq:llama-3.1-8b-instant": "llama-3.8",
};

export function formatLlmModelDisplay(model: string): string {
  const aliased = LLM_MODEL_DISPLAY_ALIASES[model];
  if (aliased) return aliased;

  if (model.startsWith("ollama:")) {
    return `Ollama ${model.slice("ollama:".length)}`;
  }
  if (model.startsWith("gemini:")) {
    return `Gemini ${model.slice("gemini:".length)}`;
  }
  if (model.startsWith("groq:")) {
    return `Groq ${model.slice("groq:".length)}`;
  }
  return model;
}

/** Turn server data gap strings into short, plain notes. */
export function friendlyDataGap(raw: string): string {
  if (raw.includes("starter team ratings") || raw.includes("seed ratings") || raw.includes("data:build")) {
    return "Limited team history in our database.";
  }
  if (raw.includes("No RAG chunks")) {
    return "Not much head-to-head history for this pairing.";
  }
  if (raw.includes("Polymarket Gamma lookup failed")) {
    return "Could not refresh the latest betting odds.";
  }
  if (raw.includes("No Polymarket")) {
    return "No live betting odds for this match yet.";
  }
  if (raw.includes("LLM unavailable")) {
    return "Using team strength and past results only.";
  }
  if (raw.includes("News buzz")) {
    return raw.replace(/^News buzz:\s*/i, "Headlines: ");
  }
  if (raw.includes("No recent news")) {
    return "No recent news headlines for this match.";
  }
  return plainEnglish(raw.replace(/\s*—\s*/g, ". ").replace(/-/g, " "));
}

export function sentimentToneLabel(tone: SentimentTone): string {
  switch (tone) {
    case "positive":
      return "Mostly positive";
    case "negative":
      return "Mostly negative";
    case "mixed":
      return "Mixed";
    default:
      return "Not much signal";
  }
}

/** Format a factor nudge as a signed chip (no unit label). */
export function formatFactorDelta(eloDelta: number): string {
  const rounded = Math.round(eloDelta);
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function injuryStatusLabel(status: InjuryStatus): string {
  switch (status) {
    case "ruled_out":
      return "Ruled out";
    case "doubtful":
      return "Doubtful";
    case "fit":
      return "Expected to play";
    default:
      return "Injury concern";
  }
}

export function friendlyLlmSkip(skipReason?: string): string | null {
  if (!skipReason) return null;
  if (skipReason === "no_api_key") {
    return "AI match read isn't turned on — we're showing stats-only picks for now.";
  }
  if (skipReason === "disabled") {
    return "AI match read was skipped for this request.";
  }
  if (skipReason.startsWith("error:")) {
    return "AI match read couldn't run — showing stats-only picks instead.";
  }
  return null;
}
