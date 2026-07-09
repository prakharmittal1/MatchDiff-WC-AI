/** FIFA WC 2026 knockout round labels (fixturedownload.com RoundNumber). */
export const WC26_ROUND_LABELS: Record<number, string> = {
  4: "Round of 32",
  5: "Round of 16",
  6: "Quarter-finals",
};

export function wc26RoundLabel(round: number, matchNumber?: number): string | null {
  // Semi-finals (round 7): matches 101 & 102 → Semi Final 1 / Semi Final 2.
  if (round === 7) {
    if (matchNumber === 101) return "Semi Final 1";
    if (matchNumber === 102) return "Semi Final 2";
    return "Semi Final";
  }
  // Final weekend (round 8): match 103 → 3rd place, match 104 → Final.
  if (round === 8) {
    if (matchNumber === 103) return "3rd Place Match";
    return "Final";
  }
  return WC26_ROUND_LABELS[round] ?? null;
}
