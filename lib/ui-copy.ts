import type { InjuryStatus, SentimentTone } from "@/lib/sentiment/types";

const NA = "n/a";

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
      return `${team} looks undervalued compared with the market`;
    case "overpriced":
      return `The market may be too high on ${team}`;
    case "aligned":
      return `We're broadly aligned with the market on ${team}`;
    case "no_market":
      return "No live odds to compare yet";
  }
}

/** UI-only labels; API model IDs stay unchanged. */
export function formatLlmModelDisplay(model: string): string {
  if (model.startsWith("ollama:")) {
    return model.slice("ollama:".length);
  }
  if (model.startsWith("gemini:")) {
    return model.slice("gemini:".length);
  }
  if (model.startsWith("groq:")) {
    return model.slice("groq:".length);
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
