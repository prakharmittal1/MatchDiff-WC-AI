import type { InjuryStatus } from "@/lib/sentiment/types";

const RULED_OUT = /\b(ruled out|will miss|won't play|will not play|out of (the )?tournament)\b/i;
const DOUBTFUL = /\b(doubtful|doubt|sidelined|fitness concern|set to miss|scan|late fitness)\b/i;
const INJURY_HINT = /\b(injur|injured|hamstring|knee|ankle|muscle|strain|fracture|surgery)\b/i;

export function classifyInjuryStatus(text: string): InjuryStatus {
  if (RULED_OUT.test(text)) return "ruled_out";
  if (DOUBTFUL.test(text)) return "doubtful";
  if (INJURY_HINT.test(text)) return "unknown";
  return "unknown";
}

export function isInjuryHeadline(text: string): boolean {
  return INJURY_HINT.test(text) || RULED_OUT.test(text) || DOUBTFUL.test(text);
}

/** Truncated injury headline fragments (e.g. "as Jurrien Timber, due to hamstring"). */
export function isIncompleteInjuryFragment(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  if (/^as\s+[A-Z]/i.test(t) && (/\bdue to\b/i.test(t) || /\bkey player\b/i.test(t))) {
    return true;
  }

  if (/\bkey player\b/i.test(t) && /\bdue to\b/i.test(t) && !/[.!?]$/.test(t)) {
    return true;
  }

  if (
    /\bdue to\s+(?:a\s+)?(?:hamstring|knee|ankle|muscle|groin|back|strain|fracture|surgery)\b/i.test(
      t,
    ) &&
    !/[.!?]$/.test(t)
  ) {
    return true;
  }

  return false;
}
