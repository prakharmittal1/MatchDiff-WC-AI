"use client";

import type {
  AnalyzeResult,
  MatchContext,
  MismatchVerdict,
  ModelAdjustments,
} from "@/lib/alpha-types";
import { formatPastMeeting } from "@/lib/format-past-meeting";
import { formatMatchVenueDisplay } from "@/lib/match-context";
import { flagFor } from "@/lib/flags";
import { formatKickoff } from "@/lib/fixtures";
import { SentimentBuzz } from "@/app/components/SentimentBuzz";
import { SoccerLoadingLine } from "@/app/components/SoccerLoadingLine";
import { polymarketMatchUrl } from "@/lib/external-links";
import type { InjuryReport } from "@/lib/sentiment/types";
import {
  formatChance,
  formatFactorDelta,
  formatGap,
  formatGapBadge,
  formatLlmModelDisplay,
  friendlyDataGap,
  injuryStatusLabel,
} from "@/lib/ui-copy";

export function LoadingSpinner({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      className={[
        "relative flex overflow-hidden",
        embedded
          ? "-m-4 min-h-[calc(var(--match-modal-height)-4.75rem)] w-[calc(100%+2rem)]"
          : "min-h-[20rem] w-full rounded-xl",
      ].join(" ")}
      role="status"
      aria-label="Analyzing match"
    >
      <video
        className="absolute inset-0 size-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      >
        <source src="/analysis-loading.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 flex w-full justify-center px-6 pt-16">
        <SoccerLoadingLine className="max-w-md text-center text-base font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]" />
      </div>
    </div>
  );
}

type Props = {
  result: AnalyzeResult | null;
  loading: boolean;
  error: string | null;
  sentimentLoading?: boolean;
  sentimentError?: string | null;
  onRefreshNews?: () => void;
  /** When true, hides the in-panel match header (modal supplies its own). */
  embedded?: boolean;
};

export function AnalysisPanel({
  result,
  loading,
  error,
  sentimentLoading = false,
  sentimentError,
  onRefreshNews,
  embedded = false,
}: Props) {
  if (loading) {
    return <LoadingSpinner embedded={embedded} />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-semibold">Could not analyze this match</p>
        <p className="mt-1 text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  if (!result) {
    return embedded ? <LoadingSpinner embedded /> : (
      <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
          <span className="size-3 rounded-full bg-emerald-500" aria-hidden />
        </div>
        <p className="text-sm font-medium text-slate-700">Pick a match to get started</p>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
          We compare our win estimate with live betting odds, then explain the read in plain
          English.
        </p>
      </div>
    );
  }

  const { match, p_model, p_market, breakdown, match_context } = result;
  const team = match.home;
  const opponent = match.away;
  const polymarketUrl = result.market.slug ? polymarketMatchUrl(result.market.slug) : null;
  const city = match_context.city;
  const injuryReports = result.sentiment?.injury_reports ?? [];
  const hasNewsContent =
    Boolean(result.sentiment) &&
    ((result.sentiment?.post_count ?? 0) > 0 || injuryReports.length > 0);

  return (
    <div
      className={[
        "flex flex-col gap-4",
        embedded ? "px-1 pb-0 sm:px-2" : "p-1 sm:p-2",
      ].join(" ")}
    >
      {!embedded && (
        <header className="border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
            <span>{flagFor(team)}</span>
            <span>{team}</span>
            <span className="font-normal text-slate-400">vs</span>
            <span>{flagFor(opponent)}</span>
            <span>{opponent}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatKickoff(match.kickoff_iso)}
            {city && (
              <>
                <span className="text-slate-300"> · </span>
                {city}
              </>
            )}
          </p>
        </header>
      )}

      {result.llm?.model && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">Match breakdown by AI</p>
          <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {formatLlmModelDisplay(result.llm.model)}
          </span>
        </div>
      )}

      <VerdictCard
        verdict={result.verdict}
        team={team}
        pExpected={result.p_expected}
        pMarket={p_market}
      />

      {result.adjustments.factors.length > 0 && (
        <FactorsCard adjustments={result.adjustments} home={team} away={opponent} />
      )}

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <DetailsChevron className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">Behind the numbers</span>
        </summary>
        <div className="border-t border-slate-100 px-3 py-3">
          <BehindTheNumbersSection
            team={team}
            opponent={opponent}
            p_model={p_model}
            breakdown={breakdown}
            match_context={match_context}
            ragHits={result.rag.hits}
            dataGaps={result.data_gaps}
          />
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm transition-colors group-open:border-sky-100 group-open:bg-sky-50/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <DetailsChevron className="text-slate-500 group-open:text-sky-700/70" />
            <span className="text-xs font-semibold text-slate-800 group-open:text-sky-900/90">
              News & Injuries
            </span>
          </span>
          {onRefreshNews && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRefreshNews();
              }}
              disabled={sentimentLoading || loading}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 group-open:border-sky-100 group-open:text-sky-800/80 group-open:hover:border-sky-200 group-open:hover:text-sky-950"
            >
              {sentimentLoading ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </summary>
        <div className="divide-y divide-sky-100 border-t border-sky-100 px-3 py-0">
          {injuryReports.length > 0 && (
            <div className="py-3">
              <InjuryReportsCard reports={injuryReports} />
            </div>
          )}
          {sentimentLoading && (
            <p className="py-3 text-xs text-slate-500">Fetching latest headlines and re-running pick…</p>
          )}
          {!sentimentLoading && sentimentError && (
            <p className="py-3 text-xs text-amber-700">
              Could not refresh news right now. {sentimentError}
            </p>
          )}
          {!sentimentLoading && !sentimentError && hasNewsContent && result.sentiment ? (
            <div className="py-3">
              <SentimentBuzz sentiment={result.sentiment} home={team} away={opponent} />
            </div>
          ) : null}
          {!sentimentLoading &&
            !sentimentError &&
            result.sentiment &&
            !hasNewsContent && (
              <p className="py-3 text-xs text-slate-500">
                No recent fixture headlines or injury reports yet.
              </p>
            )}
          {!sentimentLoading && !sentimentError && !result.sentiment && (
            <p className="py-3 text-xs text-slate-500">News lookup was skipped for this match.</p>
          )}
        </div>
      </details>

      {polymarketUrl && p_market != null && (
        <div className="flex justify-end">
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
          >
            Open live odds on Polymarket
          </a>
        </div>
      )}
    </div>
  );
}

function factorTheme(id: string): {
  row: string;
  label: string;
  chipPositive: string;
  chipNegative: string;
} {
  switch (id) {
    case "recent_form":
      return {
        row: "border-violet-200 bg-violet-50/90",
        label: "text-violet-950",
        chipPositive: "bg-emerald-600 text-white",
        chipNegative: "bg-violet-600 text-violet-50",
      };
    case "squad_value":
      return {
        row: "border-amber-300 bg-amber-50",
        label: "text-amber-950",
        chipPositive: "bg-emerald-600 text-white",
        chipNegative: "bg-amber-700 text-amber-50",
      };
    case "injuries":
      return {
        row: "border-rose-300 bg-rose-50",
        label: "text-rose-950",
        chipPositive: "bg-emerald-600 text-white",
        chipNegative: "bg-rose-700 text-white",
      };
    case "rest_asymmetry":
      return {
        row: "border-[#2a5c40]/40 bg-[#ecfdf5]",
        label: "text-[#1f4532]",
        chipPositive: "bg-emerald-600 text-white",
        chipNegative: "bg-[#1f4532] text-emerald-50",
      };
    default:
      return {
        row: "border-emerald-200 bg-emerald-50/80",
        label: "text-emerald-950",
        chipPositive: "bg-emerald-600 text-white",
        chipNegative: "bg-[#234f36] text-emerald-50",
      };
  }
}

function FactorsCard({
  adjustments,
  home,
  away,
}: {
  adjustments: ModelAdjustments;
  home: string;
  away: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">
          What&apos;s moving the number
        </h3>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Form, squad value, injuries, and rest. Little nudges that tilt our pick.
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {adjustments.factors.map((f) => {
          const positive = f.elo_delta > 0;
          const theme = factorTheme(f.id);

          return (
            <li
              key={f.id}
              className={`grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 rounded-lg border p-3 ${theme.row}`}
            >
              <span
                className={[
                  "flex min-h-[2.5rem] items-center justify-center rounded-md px-1.5 py-1 text-sm font-bold tabular-nums",
                  positive ? theme.chipPositive : theme.chipNegative,
                ].join(" ")}
                title={positive ? `Nudge toward ${home}` : `Nudge toward ${away}`}
              >
                {formatFactorDelta(f.elo_delta)}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold leading-tight ${theme.label}`}>{f.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{f.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InjuryReportsCard({ reports }: { reports: InjuryReport[] }) {
  return (
    <section className="rounded-lg bg-teal-50/70 px-3 py-3 text-xs text-slate-600">
      <p className="text-[10px] font-medium uppercase tracking-wide text-teal-700/60">
        Squad news ({reports.length})
      </p>
      <ul className="mt-2 divide-y divide-teal-100/90">
        {reports.map((r, i) => (
          <li
            key={`${r.team}-${r.player ?? r.headline}-${i}`}
            className="py-2.5 leading-snug first:pt-0 last:pb-0"
          >
            <p className="font-medium text-slate-800">
              {r.team}
              {r.player && <span className="font-normal text-slate-600"> · {r.player}</span>}
            </p>
            {(r.status === "ruled_out" || r.status === "doubtful") && (
              <p className="mt-0.5 text-[10px] text-teal-700/55">{injuryStatusLabel(r.status)}</p>
            )}
            <p className="mt-1 text-slate-600">
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-teal-200 underline-offset-2 hover:text-slate-900"
                >
                  {r.headline}
                </a>
              ) : (
                r.headline
              )}
            </p>
            {r.note && <p className="mt-1 text-slate-400">{r.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function verdictStyles(alignment: MismatchVerdict["alignment"]) {
  switch (alignment) {
    case "we_higher":
      return {
        border: "border-emerald-300",
        bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
        title: "text-emerald-900",
        badge: "bg-emerald-600 text-white",
      };
    case "market_higher":
      return {
        border: "border-amber-300",
        bg: "bg-gradient-to-br from-amber-50 to-orange-50",
        title: "text-amber-950",
        badge: "bg-amber-600 text-white",
      };
    case "no_market":
      return {
        border: "border-slate-200",
        bg: "bg-slate-50",
        title: "text-slate-900",
        badge: "bg-slate-500 text-white",
      };
    default:
      return {
        border: "border-slate-200",
        bg: "bg-slate-50",
        title: "text-slate-900",
        badge: "bg-slate-500 text-white",
      };
  }
}

function VerdictComparisonLine({
  team,
  pExpected,
  pMarket,
  gapPp,
  alignment,
}: {
  team: string;
  pExpected: number;
  pMarket: number | null;
  gapPp: number | null;
  alignment: MismatchVerdict["alignment"];
}) {
  const ourPct = formatChance(pExpected);

  if (pMarket == null) {
    return (
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        We give {team} a{" "}
        <span className="font-bold tabular-nums text-slate-900">{ourPct}</span> chance to win.
      </p>
    );
  }

  const marketPct = formatChance(pMarket);
  const gapLabel = formatGapBadge(gapPp);
  const ourClass =
    alignment === "we_higher"
      ? "font-bold tabular-nums text-emerald-700"
      : alignment === "market_higher"
        ? "font-bold tabular-nums text-amber-800"
        : "font-bold tabular-nums text-slate-900";
  const marketClass =
    alignment === "market_higher"
      ? "font-bold tabular-nums text-emerald-700"
      : alignment === "we_higher"
        ? "font-bold tabular-nums text-indigo-700"
        : "font-bold tabular-nums text-slate-700";
  const gapClass =
    gapPp == null
      ? "font-bold tabular-nums text-slate-600"
      : gapPp > 0
        ? "font-bold tabular-nums text-emerald-700"
        : gapPp < 0
          ? "font-bold tabular-nums text-amber-700"
          : "font-bold tabular-nums text-slate-600";

  return (
    <p className="mt-2 text-sm leading-relaxed text-slate-600">
      We give {team} a <span className={ourClass}>{ourPct}</span> chance to win. The market says{" "}
      <span className={marketClass}>{marketPct}</span>
      {gapLabel != null && (
        <>
          {" "}
          (<span className={gapClass}>{gapLabel}</span> difference)
        </>
      )}
      .
    </p>
  );
}

function VerdictCard({
  verdict,
  team,
  pExpected,
  pMarket,
}: {
  verdict: MismatchVerdict;
  team: string;
  pExpected: number;
  pMarket: number | null;
}) {
  const styles = verdictStyles(verdict.alignment);
  const gapLabel = formatGapBadge(verdict.gap_pp);

  return (
    <section
      className={`rounded-xl border px-4 py-3.5 shadow-sm ${styles.border} ${styles.bg}`}
      aria-label="Summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className={`text-lg font-bold leading-snug ${styles.title}`}>{verdict.headline}</h3>
        {gapLabel && (
          <span
            className={`rounded-full px-2.5 py-1 text-sm font-bold tabular-nums shadow-sm ${styles.badge}`}
          >
            {gapLabel}
          </span>
        )}
      </div>
      <VerdictComparisonLine
        team={team}
        pExpected={pExpected}
        pMarket={pMarket}
        gapPp={verdict.gap_pp}
        alignment={verdict.alignment}
      />
      {verdict.takeaway && verdict.alignment !== "aligned" && (
        <p className="mt-2 text-xs font-medium text-slate-500">{verdict.takeaway}</p>
      )}
    </section>
  );
}

function DetailsChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={[
        "size-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180",
        className,
      ].join(" ")}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function meetingRelevance(
  text: string,
  home: string,
  away: string,
): "h2h" | "either" | "other" {
  const lower = text.toLowerCase();
  const hasHome = lower.includes(home.toLowerCase());
  const hasAway = lower.includes(away.toLowerCase());
  if (hasHome && hasAway) return "h2h";
  if (hasHome || hasAway) return "either";
  return "other";
}

function BehindTheNumbersSection({
  team,
  opponent,
  p_model,
  breakdown,
  match_context,
  ragHits,
  dataGaps,
}: {
  team: string;
  opponent: string;
  p_model: number;
  breakdown: AnalyzeResult["breakdown"];
  match_context: MatchContext;
  ragHits: AnalyzeResult["rag"]["hits"];
  dataGaps: string[];
}) {
  return (
    <div className="divide-y divide-slate-100 text-xs text-slate-600">
      <div className="pb-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Raw team rating
        </p>
        <p className="mt-1 leading-snug">
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {formatChance(p_model)}
          </span>
          <span className="text-slate-500"> for {flagFor(team)} {team}</span>
        </p>
      </div>

      <MatchConditionsSection context={match_context} />

      {ragHits.length > 0 && (
        <div className="py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Past meetings ({ragHits.length})
          </p>
          <ul className="mt-2 max-h-36 divide-y divide-slate-100 overflow-auto">
            {ragHits.map((h) => {
              const line = formatPastMeeting(h.content);
              const relevance = meetingRelevance(line, team, opponent);
              return (
                <li
                  key={h.id}
                  className={[
                    "py-1.5 leading-snug first:pt-0 last:pb-0",
                    relevance === "h2h"
                      ? "font-medium text-slate-800"
                      : relevance === "either"
                        ? "text-slate-600"
                        : "text-slate-400",
                  ].join(" ")}
                >
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Team strength
          </p>
          <div className="mt-1.5 space-y-0.5 tabular-nums text-slate-800">
            <p>
              {flagFor(team)} {team}{" "}
              <span className="font-semibold">{breakdown.elo_home.toFixed(0)}</span>
            </p>
            <p>
              {flagFor(opponent)} {opponent}{" "}
              <span className="font-semibold">{breakdown.elo_away.toFixed(0)}</span>
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            History adjustment
          </p>
          <p className="mt-1.5 font-semibold tabular-nums text-slate-800">
            {formatGap(breakdown.h2h_adjustment)}
          </p>
        </div>
      </div>

      {dataGaps.length > 0 && (
        <ul className="space-y-1 pt-3 text-slate-500">
          {dataGaps.map((g, i) => (
            <li key={i}>{friendlyDataGap(g)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchConditionsSection({ context }: { context: MatchContext }) {
  const { title, detail } = formatMatchVenueDisplay(context);
  const notes = [...context.venue_notes, ...context.travel_notes];
  if (!title && !detail && notes.length === 0) return null;

  return (
    <div className="border-l-2 border-slate-200 py-3 pl-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Match conditions
      </p>
      {title && <p className="mt-1 font-medium text-slate-800">{title}</p>}
      {detail && <p className="mt-0.5 text-slate-600">{detail}</p>}
      {notes.length > 0 && (
        <p className="mt-1.5 leading-relaxed text-slate-500">{notes[0]}</p>
      )}
    </div>
  );
}

