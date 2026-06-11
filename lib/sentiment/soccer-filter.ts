import { searchTermsForTeam } from "@/lib/sentiment/query";
import type { Wc2026Team } from "@/lib/teams";

/** Headlines that clearly belong to a sport other than association football. */
const OTHER_SPORT_PATTERNS: RegExp[] = [
  /\b(NFL|NBA|MLB|NHL|NCAA|WNBA|MLS NEXT|XFL|USFL|CFL)\b/i,
  /\b(quarterback|touchdown|super bowl|linebacker|wide receiver|running back|tight end|offensive line)\b/i,
  /\b(basketball|baseball|softball|hockey|tennis|golf|cricket|rugby league|rugby union)\b/i,
  /\b(March Madness|NBA playoffs|Stanley Cup|World Series|Grand Slam|Formula 1|F1 racing)\b/i,
  /\b(college football|gridiron|pigskin)\b/i,
  /\b(AFC|NFC)\s+(championship|title|playoffs?)\b/i,
];

/** Signals that the story is about soccer / association football. */
const SOCCER_FOOTBALL_PATTERNS: RegExp[] = [
  /\b(soccer|football|fifa|world cup|wc\s*2026|wc26)\b/i,
  /\b(usmnt|football association|fa cup|premier league|la liga|bundesliga|serie a|ligue 1)\b/i,
  /\b(champions league|europa league|nations league|copa america|copa del rey)\b/i,
  /\b(striker|midfielder|defender|goalkeeper|winger|full-?back|centre-?back|center-?back)\b/i,
  /\b(national team|international duty|squad call-?up|call-?up|starting xi|line-?up)\b/i,
  /\b(penalty|corner kick|red card|yellow card|clean sheet|offside|var review)\b/i,
  /\b(group stage|knockout|round of \d+|last 16|quarter-?final|semi-?final)\b/i,
];

const FIXTURE_CONTEXT = /\b(vs\.?|v\.|versus|face off|clash|meet|opener|fixture|matchup|meeting)\b/i;

function mentionsTeam(text: string, team: Wc2026Team): boolean {
  const lower = text.toLowerCase();
  return searchTermsForTeam(team).some((term) => lower.includes(term.toLowerCase()));
}

export function isOtherSportHeadline(text: string): boolean {
  return OTHER_SPORT_PATTERNS.some((re) => re.test(text));
}

export function hasSoccerFootballSignal(text: string): boolean {
  return SOCCER_FOOTBALL_PATTERNS.some((re) => re.test(text));
}

/** Keep squad-news headlines that are clearly soccer/football, not other sports. */
export function isSoccerOrFootballNews(
  text: string,
  context?: { home?: Wc2026Team; away?: Wc2026Team },
): boolean {
  if (!text.trim()) return false;
  if (isOtherSportHeadline(text)) return false;
  if (hasSoccerFootballSignal(text)) return true;

  if (context?.home && context?.away) {
    const hasHome = mentionsTeam(text, context.home);
    const hasAway = mentionsTeam(text, context.away);
    if (hasHome && hasAway && FIXTURE_CONTEXT.test(text)) return true;
  }

  return false;
}
