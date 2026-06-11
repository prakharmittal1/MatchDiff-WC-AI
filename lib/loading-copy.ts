/** Rotating lines shown while a match is analyzed. */
export const SOCCER_LOADING_MESSAGES = [
  "Checking form and past meetings…",
  "Reading venue, travel, and altitude…",
  "Comparing our pick to market odds…",
  "Digging into head-to-head history…",
  "Checking win, draw, and loss prices…",
  "Looking for where our model differs from the market…",
  "Running the numbers on both squads…",
  "Factoring in host-city travel across North America…",
] as const;

export function pickSoccerLoadingMessage(): string {
  const i = Math.floor(Math.random() * SOCCER_LOADING_MESSAGES.length);
  return SOCCER_LOADING_MESSAGES[i]!;
}
