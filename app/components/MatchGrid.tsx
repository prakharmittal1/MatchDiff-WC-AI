"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchOutcomeButtons } from "@/app/components/MatchOutcomeButtons";
import { TeamName } from "@/app/components/TeamName";
import { formatTeamWithRank } from "@/lib/fifa-rankings";
import { formatKickoffTile, resolveFixtureVenueTile, type Fixture } from "@/lib/fixtures";

const INITIAL_ROWS = 5;
const ROWS_PER_LOAD = 5;

type Props = {
  fixtures: Fixture[];
  onAnalyze: (f: Fixture, originRect?: DOMRect) => void;
  activeId?: string;
};

function useGridColumns(): number {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqSm = window.matchMedia("(min-width: 640px)");

    const update = () => {
      if (mqLg.matches) setCols(3);
      else if (mqSm.matches) setCols(2);
      else setCols(1);
    };

    update();
    mqLg.addEventListener("change", update);
    mqSm.addEventListener("change", update);
    return () => {
      mqLg.removeEventListener("change", update);
      mqSm.removeEventListener("change", update);
    };
  }, []);

  return cols;
}

export function MatchGrid({ fixtures, onAnalyze, activeId }: Props) {
  const cols = useGridColumns();
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);
  const [prevCount, setPrevCount] = useState(fixtures.length);

  // Reset pagination when the fixture set changes (recommended over an effect).
  if (prevCount !== fixtures.length) {
    setPrevCount(fixtures.length);
    setVisibleRows(INITIAL_ROWS);
  }

  const visibleCount = Math.min(fixtures.length, visibleRows * cols);
  const visibleFixtures = fixtures.slice(0, visibleCount);
  const hasMore = visibleCount < fixtures.length;

  const loadMore = useCallback(() => {
    setVisibleRows((rows) => rows + ROWS_PER_LOAD);
  }, []);

  const collapse = useCallback(() => {
    setVisibleRows(INITIAL_ROWS);
  }, []);

  const canCollapse = visibleRows > INITIAL_ROWS;
  const showControls = canCollapse || hasMore;

  return (
    <div className="light-surface flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleFixtures.map((f) => {
          const active = f.id === activeId;
          const venue = resolveFixtureVenueTile(f);

          return (
            <button
              key={f.id}
              type="button"
              onClick={(e) => onAnalyze(f, e.currentTarget.getBoundingClientRect())}
              aria-label={`${formatTeamWithRank(f.home)} vs ${formatTeamWithRank(f.away)}, ${formatKickoffTile(f.kickoff_iso)}, ${venue}`}
              aria-current={active ? "true" : undefined}
              aria-haspopup="dialog"
              className={[
                "match-tile light-card group relative w-full overflow-hidden rounded-xl p-3.5 text-left",
                "transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                "cursor-pointer",
                active
                  ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-500/60 shadow-md"
                  : "",
              ].join(" ")}
            >
              <p className="mb-2.5 truncate text-[10px] font-bold leading-snug text-slate-900">
                {formatKickoffTile(f.kickoff_iso)}
                <span className="text-slate-500"> · </span>
                {venue}
              </p>

              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <TeamRow name={f.home} />
                  <TeamRow name={f.away} />
                </div>

                <MatchOutcomeButtons
                  teamA={f.home}
                  teamB={f.away}
                  teamAPrice={f.market_home_win}
                  drawPrice={f.market_draw}
                  teamBPrice={f.market_away_win}
                />
              </div>

              {active && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {fixtures.length === 0 && (
        <p className="light-card rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
          No matches in this group.
        </p>
      )}

      {showControls && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-[10px] text-slate-400">
            Showing {visibleCount} of {fixtures.length} matches
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="light-card inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-400 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35"
              >
                <span aria-hidden className="text-base leading-none">
                  ↓
                </span>
                Load more
              </button>
            )}
            {canCollapse && (
              <button
                type="button"
                onClick={collapse}
                className="light-card inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35"
              >
                <span aria-hidden className="text-base leading-none">
                  ↑
                </span>
                Show less
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRow({ name }: { name: string }) {
  return (
    <TeamName
      name={name}
      showFlag
      showRank
      nameClassName="text-[13px] font-semibold leading-tight text-slate-900"
      rankClassName="text-[10px] font-semibold tabular-nums text-slate-400"
      className="flex min-w-0 items-center gap-2"
    />
  );
}
