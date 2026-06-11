export type ContextNoteKind =
  | "altitude"
  | "travel"
  | "climate"
  | "heat"
  | "tournament"
  | "air"
  | "venue"
  | "general";

/** Classify venue/travel bullet text for icon display in the UI. */
export function classifyContextNote(text: string): ContextNoteKind {
  const t = text.toLowerCase();

  if (/tournament spans|~4,000 km|jet lag and inter-city travel are routine/.test(t)) {
    return "tournament";
  }
  if (
    /travel between host cities|time zones still vary|intercontinental|jet lag|regional travel|turnarounds/.test(
      t,
    )
  ) {
    return "travel";
  }
  if (/sea level|sea-level|altitude|elevation|aerobic capacity/.test(t)) {
    return "altitude";
  }
  if (/climate mismatch|cool pacific|gulf heat|microclimate|windy/.test(t)) {
    return "climate";
  }
  if (/heat|humidity|cooling break|cardiac load|hydration/.test(t)) {
    return "heat";
  }
  if (/ozone|smog|particulate|respiratory|air quality/.test(t)) {
    return "air";
  }
  if (/co-host|stadium|venue|sea-level venue|east-coast/.test(t)) {
    return "venue";
  }

  return "general";
}
