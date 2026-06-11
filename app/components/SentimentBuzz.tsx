import type { SentimentSnapshot, SentimentTone } from "@/lib/sentiment/types";
import { sentimentToneLabel } from "@/lib/ui-copy";

type Props = {
  sentiment: SentimentSnapshot;
  home: string;
  away: string;
};

function toneClass(tone: SentimentTone): string {
  switch (tone) {
    case "positive":
      return "text-emerald-700";
    case "negative":
      return "text-rose-700";
    case "mixed":
      return "text-amber-700";
    default:
      return "text-slate-500";
  }
}

export function SentimentBuzz({ sentiment, home, away }: Props) {
  const injuryReports = sentiment.injury_reports ?? [];
  if (sentiment.post_count === 0 && injuryReports.length === 0) return null;

  const quality = sentiment.coverage_quality ?? "weak";
  const showTone =
    quality === "strong" && (sentiment.home_tone !== "unknown" || sentiment.away_tone !== "unknown");
  const title = quality === "weak" ? "Recent headlines" : "Headline mood";

  return (
    <section className="rounded-lg bg-violet-50/70 px-3 py-3 text-xs text-slate-600">
      <p className="text-[10px] font-medium uppercase tracking-wide text-violet-700/60">
        {title}
        {sentiment.post_count > 0 && ` (${sentiment.post_count})`}
      </p>

      {quality === "weak" && sentiment.post_count > 0 && (
        <p className="mt-1.5 text-slate-500">
          Pre-tournament news is often TV schedules and watch guides.
        </p>
      )}

      {showTone && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-400">{home}</p>
            <p className={`font-medium ${toneClass(sentiment.home_tone)}`}>
              {sentimentToneLabel(sentiment.home_tone)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">{away}</p>
            <p className={`font-medium ${toneClass(sentiment.away_tone)}`}>
              {sentimentToneLabel(sentiment.away_tone)}
            </p>
          </div>
        </div>
      )}

      {sentiment.themes.filter((theme) => theme !== "Injuries & fitness").length > 0 && (
        <p className="mt-2 text-[10px] text-violet-700/55">
          {sentiment.themes.filter((theme) => theme !== "Injuries & fitness").join(" · ")}
        </p>
      )}

      {sentiment.sample_quotes.length > 0 && (
        <ul className="mt-2 divide-y divide-violet-100/90">
          {sentiment.sample_quotes.map((q, i) => (
            <li key={i} className="py-2 leading-snug first:pt-0 last:pb-0">
              {q.url ? (
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 underline decoration-violet-200 underline-offset-2 hover:text-slate-900"
                >
                  {q.text}
                </a>
              ) : (
                q.text
              )}
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
