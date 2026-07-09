"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { AnalysisPanel } from "@/app/components/AnalysisPanel";
import { BrandMark } from "@/app/components/BrandMark";
import { GroupFilter } from "@/app/components/GroupFilter";
import { MatchAnalysisModal } from "@/app/components/MatchAnalysisModal";
import { MatchGrid } from "@/app/components/MatchGrid";
import { requestMatchAnalysis } from "@/lib/analyze-client";
import { filterFixturesByGroup } from "@/lib/fixture-groups";
import { filterUpcomingFixtures } from "@/lib/upcoming-fixtures";
import type { AnalyzeResult } from "@/lib/alpha-types";
import { FIFA_WC_2026_FIXTURES_URL, POLYMARKET_WC_GAMES_URL } from "@/lib/external-links";
import type { Fixture } from "@/lib/fixtures";
import { formatChance } from "@/lib/ui-copy";

type Props = {
  fixtures: Fixture[];
  initialMatchId?: string | null;
};

function buildShareUrl(fixtureId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("match", fixtureId);
  return url.toString();
}

function findFixture(fixtures: Fixture[], id: string | null | undefined): Fixture | null {
  if (!id) return null;
  return fixtures.find((f) => f.id === id) ?? null;
}

export function Dashboard({ fixtures, initialMatchId = null }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const upcomingFixtures = useMemo(
    () => filterUpcomingFixtures(fixtures, nowMs),
    [fixtures, nowMs],
  );

  const deepLinkFixture = useMemo(
    () => findFixture(upcomingFixtures, initialMatchId),
    [upcomingFixtures, initialMatchId],
  );

  const [activeId, setActiveId] = useState<string | undefined>(deepLinkFixture?.id);
  const [activeFixture, setActiveFixture] = useState<Fixture | null>(deepLinkFixture);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(Boolean(deepLinkFixture));
  const [error, setError] = useState<string | null>(null);

  const filteredFixtures = useMemo(
    () => filterFixturesByGroup(upcomingFixtures, selectedGroup),
    [upcomingFixtures, selectedGroup],
  );

  const syncMatchParam = useCallback((fixtureId?: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (fixtureId) url.searchParams.set("match", fixtureId);
    else url.searchParams.delete("match");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!deepLinkFixture) return;

    syncMatchParam(deepLinkFixture.id);
    let cancelled = false;

    requestMatchAnalysis(deepLinkFixture)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not analyze this match");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deepLinkFixture, syncMatchParam]);

  const runAnalysis = useCallback(
    async (f: Fixture, rect?: DOMRect) => {
      setActiveId(f.id);
      setActiveFixture(f);
      setOriginRect(rect ?? null);
      setLoading(true);
      setError(null);
      setResult(null);
      syncMatchParam(f.id);

      try {
        setResult(await requestMatchAnalysis(f));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not analyze this match");
      } finally {
        setLoading(false);
      }
    },
    [syncMatchParam],
  );

  const onCloseModal = useCallback(() => {
    setActiveId(undefined);
    setActiveFixture(null);
    setOriginRect(null);
    setResult(null);
    setError(null);
    syncMatchParam(undefined);
  }, [syncMatchParam]);

  const shareUrl = activeFixture ? buildShareUrl(activeFixture.id) : null;
  const shareText =
    activeFixture && result
      ? `${activeFixture.home} vs ${activeFixture.away}, MatchDiff ${formatChance(result.p_expected)}${
          result.p_market != null ? ` vs market ${formatChance(result.p_market)}` : ""
        }`
      : activeFixture
        ? `${activeFixture.home} vs ${activeFixture.away}`
        : null;

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6">
      <Link
        href="/faq"
        className="fixed right-5 top-5 z-40 rounded-lg border border-white/10 bg-black/45 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors hover:border-emerald-400/40 hover:bg-black/55 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 sm:right-6 sm:top-6"
      >
        FAQ
      </Link>

      <div className="page-hero flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="w-fit rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
            <BrandMark />
          </Link>
          <div className="flex max-w-md flex-col gap-1 sm:items-end sm:text-right">
            <h1 className="hero-title text-2xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
              Beat the market{" "}
              <span className="brand-marquee">before it catches up</span>
            </h1>
          </div>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <p className="hero-lede max-w-2xl text-sm leading-relaxed">
            Tap a match to see our model&apos;s prediction vs live Polymarket odds.
          </p>
          <p className="shrink-0 text-sm leading-relaxed sm:text-right">
            Schedule on{" "}
            <a
              href={FIFA_WC_2026_FIXTURES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-300 underline decoration-emerald-300/45 underline-offset-2 hover:text-emerald-200 hover:decoration-emerald-200/70"
            >
              FIFA.com
            </a>
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
            <span aria-hidden className="inline-block size-2 rounded-full bg-emerald-400" />
            Quarter-finals
          </h2>
          <GroupFilter
            fixtures={upcomingFixtures}
            value={selectedGroup}
            onChange={setSelectedGroup}
          />
        </div>

        <MatchGrid
          key={selectedGroup}
          fixtures={filteredFixtures}
          onAnalyze={runAnalysis}
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
        <AnalysisPanel result={result} loading={loading} error={error} />
      </MatchAnalysisModal>

      <footer className="pt-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-emerald-200/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          <span>Team ratings · news · model</span>
          <span aria-hidden className="text-emerald-200/40">
            ·
          </span>
          <Link
            href="/faq"
            className="underline decoration-emerald-200/25 underline-offset-2 hover:text-emerald-100"
          >
            FAQ
          </Link>
          <span aria-hidden className="text-emerald-200/40">
            ·
          </span>
          <a
            href={POLYMARKET_WC_GAMES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-emerald-200/25 underline-offset-2 hover:text-emerald-100"
          >
            Polymarket odds
          </a>
          <span aria-hidden className="text-emerald-200/40">
            ·
          </span>
          <span>Kickoff 11 Jun 2026</span>
        </div>
      </footer>
    </main>
  );
}
