/** FIFA WC 2026 knockout round labels (fixturedownload.com RoundNumber). */
export const WC26_ROUND_LABELS: Record<number, string> = {
  4: "Round of 32",
  5: "Round of 16",
  6: "Quarter-finals",
  7: "Semi-finals",
};

export function wc26RoundLabel(round: number, matchNumber?: number): string | null {
  if (round === 8) {
    if (matchNumber === 104) return "Final";
    if (matchNumber === 103) return "Third place";
    return "Final";
  }
  return WC26_ROUND_LABELS[round] ?? null;
}
