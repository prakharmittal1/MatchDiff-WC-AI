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
    <section>
      <p className="text-xs font-semibold text-slate-600">
        {title}
        {sentiment.post_count > 0 && (
          <span className="ml-1.5 font-normal text-slate-400">({sentiment.post_count})</span>
        )}
      </p>

      {quality === "weak" && sentiment.post_count > 0 && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Pre-tournament news is often TV schedules and watch guides.
        </p>
      )}

      {showTone && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-100 bg-white/90 px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-400">{home}</p>
            <p className={`mt-0.5 text-sm font-semibold ${toneClass(sentiment.home_tone)}`}>
              {sentimentToneLabel(sentiment.home_tone)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-white/90 px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-400">{away}</p>
            <p className={`mt-0.5 text-sm font-semibold ${toneClass(sentiment.away_tone)}`}>
              {sentimentToneLabel(sentiment.away_tone)}
            </p>
          </div>
        </div>
      )}

      {sentiment.themes.filter((theme) => theme !== "Injuries & fitness").length > 0 && (
        <p className="mt-2.5 text-[11px] text-slate-500">
          {sentiment.themes.filter((theme) => theme !== "Injuries & fitness").join(" · ")}
        </p>
      )}

      {sentiment.sample_quotes.length > 0 && (
        <ul className="mt-2.5 space-y-2">
          {sentiment.sample_quotes.map((q, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-100 bg-white/90 p-3 text-sm leading-snug shadow-sm shadow-slate-900/[0.03]"
            >
              {q.url ? (
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900 hover:decoration-slate-400"
                >
                  {q.text}
                </a>
              ) : (
                <span className="text-slate-700">{q.text}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
