import Link from "next/link";

import { BrandMark } from "@/app/components/BrandMark";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import { POLYMARKET_WC_GAMES_URL } from "@/lib/external-links";

export const metadata = {
  title: "FAQ · MatchDiff",
  description:
    "Frequently asked questions about MatchDiff, Polymarket prices, and AI match analysis for World Cup 2026.",
};

export default function FaqPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6">
      <div className="page-hero flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="w-fit rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
            <BrandMark />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-emerald-300 underline decoration-emerald-300/40 underline-offset-2 hover:text-emerald-200"
          >
            ← Back to matches
          </Link>
        </div>

        <div>
          <h1 className="hero-title text-2xl font-semibold tracking-tight sm:text-3xl">FAQ</h1>
          <p className="hero-lede mt-2 max-w-2xl text-sm leading-relaxed">
            How MatchDiff works, how we use Polymarket prices, and what we do (and do not) do.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title} className="light-surface light-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
              {section.title}
            </h2>
            <div className="mt-4 flex flex-col gap-2">
              {section.items.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-slate-200/90 bg-white/90"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                    <span
                      aria-hidden
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-800 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                    {item.question}
                  </summary>
                  <div className="border-t border-slate-100 px-4 py-3.5 text-sm leading-relaxed text-slate-700">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="pb-4 pt-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-emerald-200/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          <Link
            href="/"
            className="underline decoration-emerald-200/25 underline-offset-2 hover:text-emerald-100"
          >
            Matches
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
        </div>
      </footer>
    </main>
  );
}
