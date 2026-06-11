"use client";

import type { ReactNode } from "react";
import type {
  AnalyzeResult,
  MatchContext,
  MismatchVerdict,
  ModelAdjustments,
} from "@/lib/alpha-types";
import { formatPastMeeting } from "@/lib/format-past-meeting";
import { formatMatchVenueDisplay } from "@/lib/match-context";
import { ContextNoteRow } from "@/app/components/ContextNoteIcon";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { SentimentBuzz } from "@/app/components/SentimentBuzz";
import { TeamName } from "@/app/components/TeamName";
import { polymarketMatchUrl } from "@/lib/external-links";
import type { InjuryReport, InjuryStatus } from "@/lib/sentiment/types";
import { isIncompleteInjuryFragment } from "@/lib/sentiment/injury-text";
import type { AltitudeBand } from "@/lib/venues";
import {
  formatChance,
  formatFactorDelta,
  formatGap,
  formatGapBadge,
  formatLlmModelDisplay,
  friendlyDataGap,
  injuryStatusLabel,
} from "@/lib/ui-copy";

const panelCard =
  "rounded-2xl border border-white/80 bg-white/95 shadow-sm shadow-slate-900/[0.04]";

const verdictCardBase =
  "rounded-2xl border shadow-sm shadow-slate-900/[0.06] ring-1 ring-inset ring-white/40";

type Props = {
  result: AnalyzeResult | null;
  loading: boolean;
  error: string | null;
};

export function AnalysisPanel({ result, loading, error }: Props) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={`${panelCard} border-rose-200/80 p-5 text-sm text-rose-900`}>
        <p className="font-semibold">Couldn&apos;t build this match read</p>
        <p className="mt-1.5 text-xs leading-relaxed text-rose-700">{error}</p>
      </div>
    );
  }

  if (!result) {
    return <LoadingSpinner />;
  }

  const { match, p_model, p_market, breakdown, match_context } = result;
  const team = match.home;
  const opponent = match.away;
  const polymarketUrl = result.market.slug ? polymarketMatchUrl(result.market.slug) : null;
  const injuryReports = result.sentiment?.injury_reports ?? [];
  const hasNewsContent =
    Boolean(result.sentiment) &&
    ((result.sentiment?.post_count ?? 0) > 0 || injuryReports.length > 0);

  return (
    <div className="flex flex-col gap-5 pb-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          MatchDiff analysis
        </p>
        {result.llm?.model && (
          <span className="shrink-0 rounded-full border border-slate-200/90 bg-white/80 px-2.5 py-1 text-[10px] font-medium text-slate-500">
            {formatLlmModelDisplay(result.llm.model)}
          </span>
        )}
      </div>

      <VerdictCard
        verdict={result.verdict}
        team={team}
        pExpected={result.p_expected}
        pMarket={p_market}
      />

      {result.adjustments.factors.length > 0 && (
        <FactorsCard adjustments={result.adjustments} home={team} away={opponent} />
      )}

      <details className={`group ${panelCard}`}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <DetailsChevron className="text-slate-500" />
          <span className="flex-1 text-sm font-medium text-slate-800">How we got there</span>
          <span className="text-xs font-normal text-slate-400 group-open:hidden">Show details</span>
        </summary>
        <div className="border-t border-slate-100 px-4 py-4">
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

      <details className={`group ${panelCard} transition-colors group-open:border-sky-200/80 group-open:bg-sky-50/40`}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <DetailsChevron className="text-slate-500 group-open:text-sky-700/70" />
          <span className="flex-1 text-sm font-medium text-slate-800 group-open:text-sky-950/90">
            Latest news & injuries
          </span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {injuryReports.length > 0 && <InjuryReportsCard reports={injuryReports} />}
          {hasNewsContent && result.sentiment ? (
            <SentimentBuzz sentiment={result.sentiment} home={team} away={opponent} />
          ) : null}
          {result.sentiment && !hasNewsContent && (
            <p className="py-4 text-sm text-slate-500">
              No recent headlines or injury updates for this match yet.
            </p>
          )}
          {!result.sentiment && (
            <p className="py-4 text-sm text-slate-500">News wasn&apos;t included in this analysis.</p>
          )}
        </div>
      </details>

      {polymarketUrl && p_market != null && (
        <div className="flex justify-end pt-1">
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#1f4532] underline decoration-[#1f4532]/25 underline-offset-[3px] transition-colors hover:text-[#065f46] hover:decoration-[#065f46]/40"
          >
            View live odds on Polymarket
            <span aria-hidden>→</span>
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
    <section className={`${panelCard} p-4 sm:p-5`}>
      <h3 className="text-sm font-semibold leading-snug text-slate-900">
        What moved our view:{" "}
        <span className="font-normal text-slate-500">
          Form, squad quality, injuries, and rest, the small shifts that nudge the pick.
        </span>
      </h3>
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
                title={positive ? `Tilts toward ${home}` : `Tilts toward ${away}`}
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
    <section>
      <p className="text-xs font-semibold text-slate-600">
        Squad news
        <span className="ml-1.5 font-normal text-slate-400">({reports.length})</span>
      </p>
      <ul className="mt-2.5 space-y-2">
        {reports.map((r, i) => {
          const showHeadline = r.headline && !isIncompleteInjuryFragment(r.headline);
          const showNote = r.note && !isIncompleteInjuryFragment(r.note);

          return (
            <li
              key={`${r.team}-${r.player ?? r.headline}-${i}`}
              className="rounded-xl border border-slate-100 bg-white/90 p-3 shadow-sm shadow-slate-900/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <TeamName
                    name={r.team}
                    showFlag
                    className="items-center gap-1.5"
                    nameClassName="text-sm font-semibold text-slate-900"
                  />
                  {r.player && (
                    <p className="mt-1 text-sm font-medium text-slate-700">{r.player}</p>
                  )}
                </div>
                {(r.status === "ruled_out" || r.status === "doubtful") && (
                  <span className={injuryStatusBadgeClass(r.status)}>
                    {injuryStatusLabel(r.status)}
                  </span>
                )}
              </div>
              {showHeadline && (
                <p className="mt-2 text-sm leading-snug text-slate-600">
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900 hover:decoration-slate-400"
                    >
                      {r.headline}
                    </a>
                  ) : (
                    r.headline
                  )}
                </p>
              )}
              {showNote && <p className="mt-1.5 text-xs text-slate-400">{r.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function verdictStyles(alignment: MismatchVerdict["alignment"]) {
  switch (alignment) {
    case "we_higher":
      return {
        border: "border-emerald-300/70",
        bg: "bg-gradient-to-br from-emerald-100/90 via-emerald-50/95 to-teal-100/80",
        badge: "bg-emerald-700 text-white shadow-sm shadow-emerald-900/15",
      };
    case "market_higher":
      return {
        border: "border-amber-300/70",
        bg: "bg-gradient-to-br from-amber-100/90 via-amber-50/95 to-orange-100/75",
        badge: "bg-amber-700 text-white shadow-sm shadow-amber-900/15",
      };
    case "no_market":
      return {
        border: "border-slate-200/90",
        bg: "bg-gradient-to-br from-slate-50 to-slate-100/80",
        badge: "bg-slate-600 text-white",
      };
    default:
      return {
        border: "border-sky-200/70",
        bg: "bg-gradient-to-br from-sky-50/95 via-slate-50 to-emerald-50/80",
        badge: "bg-slate-500 text-white",
      };
  }
}

function VerdictComparisonLine({
  team,
  pExpected,
  pMarket,
  gapPp,
}: {
  team: string;
  pExpected: number;
  pMarket: number | null;
  gapPp: number | null;
}) {
  const ourPct = formatChance(pExpected);
  const valueChip = "rounded-md px-2 py-0.5 font-bold tabular-nums shadow-sm";
  const ourReadChip = `${valueChip} bg-indigo-600 text-white shadow-indigo-900/10`;
  const marketChip = `${valueChip} bg-amber-600 text-white shadow-amber-900/10`;
  const gapPositiveChip = `${valueChip} bg-emerald-600 text-white shadow-emerald-900/10`;
  const gapNegativeChip = `${valueChip} bg-rose-600 text-white shadow-rose-900/10`;
  const gapNeutralChip = `${valueChip} bg-slate-500 text-white`;

  if (pMarket == null) {
    return (
      <p className="mt-2.5 text-sm leading-relaxed text-slate-800">
        We give {team} a <span className={ourReadChip}>{ourPct}</span> chance to win.
      </p>
    );
  }

  const marketPct = formatChance(pMarket);
  const gapLabel = formatGapBadge(gapPp);
  const gapChip =
    gapPp == null || gapPp === 0
      ? gapNeutralChip
      : gapPp > 0
        ? gapPositiveChip
        : gapNegativeChip;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-none">
      <span className="font-medium text-slate-800">MatchDiff:</span>
      <span className={ourReadChip}>{ourPct}</span>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <span className="font-medium text-slate-800">Market:</span>
      <span className={marketChip}>{marketPct}</span>
      {gapLabel != null && (
        <>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="font-medium text-slate-800">Gap:</span>
          <span className={gapChip}>{gapLabel}</span>
        </>
      )}
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
      className={`${verdictCardBase} px-4 py-4 sm:px-5 sm:py-4 ${styles.border} ${styles.bg}`}
      aria-label="Summary"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug text-amber-800 sm:text-xl">
            {verdict.headline}
          </h3>
          <VerdictComparisonLine
            team={team}
            pExpected={pExpected}
            pMarket={pMarket}
            gapPp={verdict.gap_pp}
          />
          {verdict.takeaway && verdict.alignment !== "aligned" && (
            <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{verdict.takeaway}</p>
          )}
        </div>
        {gapLabel && (
          <span
            className={`shrink-0 self-center rounded-full px-3 py-1.5 text-xs font-bold tabular-nums sm:text-sm ${styles.badge}`}
            title="Gap vs market"
          >
            {gapLabel} vs market
          </span>
        )}
      </div>
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
  const h2h = breakdown.h2h_adjustment;
  const h2hNeutral = h2h == null || Math.abs(h2h) < 0.0005;

  return (
    <div className="space-y-3 text-sm text-slate-800">
      <DetailBlock title="Starting point">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="shrink-0 text-3xl font-bold tabular-nums leading-none text-slate-950">
            {formatChance(p_model)}
          </span>
          <span className="text-sm font-medium text-slate-700">win chance for</span>
          <TeamName
            name={team}
            showFlag
            className="shrink-0"
            nameClassName="whitespace-nowrap text-base font-semibold leading-none text-slate-950"
          />
        </div>
      </DetailBlock>

      <MatchConditionsSection context={match_context} />

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailBlock title="Team ratings">
          <ul className="space-y-2.5">
            <RatingRow name={team} rating={breakdown.elo_home} />
            <RatingRow name={opponent} rating={breakdown.elo_away} />
          </ul>
        </DetailBlock>

        <DetailBlock title="History nudge">
          <p className="text-xs leading-relaxed text-slate-700">
            Shift from past meetings between these teams
          </p>
          <span
            className={[
              "mt-2 inline-flex rounded-md px-2.5 py-1 text-sm font-bold tabular-nums",
              h2hNeutral
                ? "bg-slate-200/80 text-slate-800"
                : h2h > 0
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900",
            ].join(" ")}
          >
            {h2hNeutral ? "Neutral" : formatGap(h2h)}
          </span>
        </DetailBlock>
      </div>

      {ragHits.length > 0 && (
        <DetailBlock title={`Head to Head (${ragHits.length})`}>
          <ul className="max-h-40 space-y-2 overflow-auto pr-1">
            {ragHits.map((h) => (
              <li
                key={h.id}
                className="rounded-lg bg-slate-100/90 px-2.5 py-2 text-sm leading-snug text-slate-900"
              >
                {formatPastMeeting(h.content)}
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}

      {dataGaps.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900/80">
          {dataGaps.map((g, i) => (
            <li key={i}>{friendlyDataGap(g)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-sm shadow-slate-900/[0.04]",
        className,
      ].join(" ")}
    >
      <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function RatingRow({ name, rating }: { name: string; rating: number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <TeamName
        name={name}
        showFlag
        className="min-w-0 items-center gap-1.5"
        nameClassName="truncate text-sm font-semibold text-slate-900"
      />
      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-950">
        {rating.toFixed(0)}
      </span>
    </li>
  );
}

function altitudeBadgeLabel(band: AltitudeBand | null | undefined): string | null {
  switch (band) {
    case "high":
      return "High altitude";
    case "moderate":
      return "Some altitude";
    case "sea_level":
      return "Sea level";
    default:
      return null;
  }
}

function injuryStatusBadgeClass(status: InjuryStatus): string {
  const base = "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  switch (status) {
    case "ruled_out":
      return `${base} bg-rose-100 text-rose-800`;
    case "doubtful":
      return `${base} bg-amber-100 text-amber-800`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

function MatchConditionsSection({ context }: { context: MatchContext }) {
  const { title, detail } = formatMatchVenueDisplay(context);
  const notes = [...context.venue_notes, ...context.travel_notes];
  const altitude = altitudeBadgeLabel(context.altitude_band);
  if (!title && !detail && notes.length === 0 && !altitude && !context.climate) return null;

  return (
    <DetailBlock title="Venue & conditions">
      {title && <p className="text-base font-semibold text-slate-950">{title}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {altitude && (
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-900">
            {altitude}
          </span>
        )}
        {context.climate && (
          <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
            {context.climate}
          </span>
        )}
      </div>
      {detail && !detail.toLowerCase().includes("altitude") && (
        <p className="mt-2 text-sm font-medium text-slate-800">{detail}</p>
      )}
      {notes.length > 0 && (
        <ul className="mt-2.5 space-y-2">
          {notes.map((note) => (
            <ContextNoteRow key={note} text={note} />
          ))}
        </ul>
      )}
    </DetailBlock>
  );
}

