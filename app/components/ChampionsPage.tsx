import Link from "next/link";

import { BrandMark } from "@/app/components/BrandMark";
import { flagFor } from "@/lib/flags";

export function ChampionsPage() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 py-8 sm:px-6">
      <Link
        href="/faq"
        className="fixed right-5 top-5 z-40 rounded-lg border border-white/10 bg-black/45 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors hover:border-emerald-400/40 hover:bg-black/55 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 sm:right-6 sm:top-6"
      >
        FAQ
      </Link>

      <section className="champions-hero relative flex flex-1 flex-col justify-center gap-10 py-10 sm:py-16">
        <div className="champions-rise">
          <BrandMark />
        </div>

        <div className="flex max-w-3xl flex-col gap-6">
          <p className="champions-rise champions-rise-delay-1 font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-300/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
            FIFA World Cup 2026
          </p>

          <div className="champions-rise champions-rise-delay-2 flex items-center gap-4 sm:gap-5">
            <span
              aria-hidden
              className="champions-flag text-5xl leading-none sm:text-7xl"
            >
              {flagFor("Spain")}
            </span>
            <h1 className="hero-title text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
              Congratulations{" "}
              <span className="champions-gold">Spain</span>
            </h1>
          </div>

          <p className="champions-rise champions-rise-delay-3 hero-lede max-w-xl text-base leading-relaxed sm:text-lg">
            Champions of the world. MatchDiff tracked the market through every
            group, knockout, and the Final. Spain lift the trophy.
          </p>

          <div className="champions-rise champions-rise-delay-4 flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/world-cup"
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5 hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
            >
              See how MatchDiff looked during the World Cup
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-medium text-emerald-100 backdrop-blur-sm transition-colors hover:border-emerald-400/40 hover:bg-black/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              FAQ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
