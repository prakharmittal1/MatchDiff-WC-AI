"use client";

import { useCallback, useMemo, useState } from "react";

import { AnalysisPanel } from "@/app/components/AnalysisPanel";
import { BrandMark } from "@/app/components/BrandMark";
import { GroupFilter } from "@/app/components/GroupFilter";
import { MatchAnalysisModal } from "@/app/components/MatchAnalysisModal";
import { MatchGrid } from "@/app/components/MatchGrid";
import { filterFixturesByGroup } from "@/lib/fixture-groups";
import type { AnalyzeResult } from "@/lib/alpha-types";
import { FIFA_WC_2026_FIXTURES_URL, POLYMARKET_WC_GAMES_URL } from "@/lib/external-links";
import type { Fixture } from "@/lib/fixtures";
import { formatChance } from "@/lib/ui-copy";

type Props = {
  fixtures: Fixture[];
};

function buildShareUrl(fixtureId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("match", fixtureId);
  return url.toString();
}

export function Dashboard({ fixtures }: Props) {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [activeFixture, setActiveFixture] = useState<Fixture | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredFixtures = useMemo(
    () => filterFixturesByGroup(fixtures, selectedGroup),
    [fixtures, selectedGroup],
  );

  const syncMatchParam = useCallback((fixtureId?: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (fixtureId) url.searchParams.set("match", fixtureId);
    else url.searchParams.delete("match");
    window.history.replaceState(null, "", url);
  }, []);

  const requestAnalyze = useCallback(
    async (
      f: Fixture,
      opts?: { includeSentiment?: boolean; includeLlm?: boolean; refreshSentiment?: boolean },
    ): Promise<AnalyzeResult> => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          home: f.home,
          away: f.away,
          kickoff_iso: f.kickoff_iso,
          competition: f.competition,
          p_market:
            f.market_price_source === "polymarket" ? f.market_home_win : undefined,
          market_draw: f.market_draw ?? undefined,
          market_away_win: f.market_away_win ?? undefined,
          polymarket_event_slug:
            f.polymarket_event_slug ?? f.polymarket_market_slug ?? undefined,
          polymarket_market_slug: f.polymarket_market_slug,
          venue: f.venue,
          is_world_cup: f.is_world_cup ?? true,
          include_sentiment: opts?.includeSentiment,
          include_llm: opts?.includeLlm,
          refresh_sentiment: opts?.refreshSentiment,
        }),
      });
      const data = (await res.json()) as AnalyzeResult | { error?: string };
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String(data.error)
            : `Something went wrong (${res.status})`;
        throw new Error(msg);
      }
      return data as AnalyzeResult;
    },
    [],
  );

  const onAnalyzeFixture = useCallback(
    async (f: Fixture, rect?: DOMRect) => {
      setActiveId(f.id);
      setActiveFixture(f);
      setOriginRect(rect ?? null);
      setLoading(true);
      setError(null);
      setSentimentError(null);
      setResult(null);
      syncMatchParam(f.id);

      try {
        const base = await requestAnalyze(f, { includeSentiment: true });
        setResult(base);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not analyze this match");
      } finally {
        setLoading(false);
      }
    },
    [requestAnalyze, syncMatchParam],
  );

  const onRefreshNews = useCallback(async () => {
    if (!activeFixture || sentimentLoading || loading) return;
    setSentimentError(null);
    setSentimentLoading(true);
    try {
      const refreshed = await requestAnalyze(activeFixture, {
        includeSentiment: true,
        refreshSentiment: true,
      });
      setResult(refreshed);
    } catch (err) {
      setSentimentError(
        err instanceof Error ? err.message : "Could not refresh news and pick",
      );
    } finally {
      setSentimentLoading(false);
    }
  }, [activeFixture, loading, requestAnalyze, sentimentLoading]);

  const onCloseModal = useCallback(() => {
    setActiveId(undefined);
    setActiveFixture(null);
    setOriginRect(null);
    setResult(null);
    setError(null);
    setSentimentError(null);
    syncMatchParam(undefined);
  }, [syncMatchParam]);

  const shareUrl = activeFixture ? buildShareUrl(activeFixture.id) : null;
  const shareText =
    activeFixture && result
      ? `${activeFixture.home} vs ${activeFixture.away} — our pick ${formatChance(result.p_expected)}${
          result.p_market != null ? ` vs market ${formatChance(result.p_market)}` : ""
        }`
      : activeFixture
        ? `${activeFixture.home} vs ${activeFixture.away}`
        : null;

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6">
      <div className="page-hero flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <BrandMark />
          <div className="flex max-w-md flex-col gap-1 sm:items-end sm:text-right">
            <span className="hero-kicker font-mono text-[10px] font-medium uppercase tracking-[0.22em]">
              Group stage · 2026
            </span>
            <h1 className="hero-title text-2xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
              Beat the market{" "}
              <span className="brand-marquee">before it catches up</span>
            </h1>
          </div>
        </header>

        <p className="hero-lede max-w-2xl text-sm leading-relaxed">
          Tap a match to compare our win estimate with live betting odds. Schedule on{" "}
          <a
            href={FIFA_WC_2026_FIXTURES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-300 underline decoration-emerald-300/45 underline-offset-2 hover:text-emerald-200 hover:decoration-emerald-200/70"
          >
            FIFA.com
          </a>
          .
        </p>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              <span aria-hidden className="inline-block size-2 rounded-full bg-emerald-400" />
              Group stage
            </h2>
            <span className="font-mono text-[10px] text-slate-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              {filteredFixtures.length} of {fixtures.length} matches
            </span>
          </div>
          <GroupFilter
            fixtures={fixtures}
            value={selectedGroup}
            onChange={setSelectedGroup}
          />
        </div>

        <MatchGrid
          key={selectedGroup}
          fixtures={filteredFixtures}
          onAnalyze={onAnalyzeFixture}
          activeId={activeId}
        />
      </section>

      <MatchAnalysisModal
        open={activeFixture != null}
        fixture={activeFixture}
        originRect={originRect}
        onClose={onCloseModal}
        shareUrl={shareUrl}
        shareText={shareText}
      >
        <AnalysisPanel
          embedded
          result={result}
          loading={loading}
          sentimentLoading={sentimentLoading}
          sentimentError={sentimentError}
          onRefreshNews={onRefreshNews}
          error={error}
        />
      </MatchAnalysisModal>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-600/70" />
          Team stats · news · AI read
        </span>
        <span aria-hidden>·</span>
        <a
          href={POLYMARKET_WC_GAMES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-300/90 underline decoration-emerald-300/30 underline-offset-2 hover:text-emerald-200"
        >
          Polymarket odds
        </a>
        <span aria-hidden>·</span>
        <span>Kickoff 11 Jun 2026</span>
      </footer>
    </main>
  );
}
