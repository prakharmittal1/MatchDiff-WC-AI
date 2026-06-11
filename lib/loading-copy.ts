/** Rotating lines shown while a match is analyzed. */
export const SOCCER_LOADING_MESSAGES = [
  "Checking recent form…",
  "Reviewing past meetings…",
  "Reading venue and travel…",
  "Comparing our view to the market…",
  "Pulling the latest squad news…",
  "Putting the pieces together…",
] as const;

export function pickSoccerLoadingMessage(): string {
  const i = Math.floor(Math.random() * SOCCER_LOADING_MESSAGES.length);
  return SOCCER_LOADING_MESSAGES[i]!;
}
