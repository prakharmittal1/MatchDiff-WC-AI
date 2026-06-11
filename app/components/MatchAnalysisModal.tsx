"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { TeamName } from "@/app/components/TeamName";
import { type Fixture } from "@/lib/fixtures";

type Props = {
  open: boolean;
  fixture: Fixture | null;
  originRect: DOMRect | null;
  onClose: () => void;
  shareUrl?: string | null;
  shareText?: string | null;
  children: ReactNode;
};

function computeOriginTransform(
  rect: DOMRect | null,
  modalEl: HTMLElement | null,
): { x: number; y: number; scale: number } | null {
  if (!rect || !modalEl) return null;

  const modal = modalEl.getBoundingClientRect();
  if (modal.width <= 0 || modal.height <= 0) return null;

  const tileCx = rect.left + rect.width / 2;
  const tileCy = rect.top + rect.height / 2;
  const modalCx = modal.left + modal.width / 2;
  const modalCy = modal.top + modal.height / 2;

  return {
    x: tileCx - modalCx,
    y: tileCy - modalCy,
    scale: Math.min(rect.width / modal.width, rect.height / modal.height, 1),
  };
}

function applyOriginVars(panel: HTMLElement, originRect: DOMRect | null): void {
  const transform = computeOriginTransform(originRect, panel);
  if (transform) {
    panel.style.setProperty("--modal-from-x", `${transform.x}px`);
    panel.style.setProperty("--modal-from-y", `${transform.y}px`);
    panel.style.setProperty("--modal-from-scale", `${Math.max(transform.scale, 0.35)}`);
    return;
  }
  panel.style.setProperty("--modal-from-x", "0px");
  panel.style.setProperty("--modal-from-y", "24px");
  panel.style.setProperty("--modal-from-scale", "0.92");
}

export function MatchAnalysisModal({
  open,
  fixture,
  originRect,
  onClose,
  shareUrl,
  shareText,
  children,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [shareLabel, setShareLabel] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    applyOriginVars(panelRef.current, originRect);
    panelRef.current.focus({ preventScroll: true });
  }, [open, originRect, fixture?.id]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!shareLabel) return;
    const t = window.setTimeout(() => setShareLabel(null), 2200);
    return () => window.clearTimeout(t);
  }, [shareLabel]);

  const handleShare = useCallback(async () => {
    if (!fixture || !shareUrl) return;

    const title = `${fixture.home} vs ${fixture.away}`;
    const text = shareText ?? title;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLabel("Copied!");
    } catch {
      setShareLabel("Could not copy link");
    }
  }, [fixture, shareText, shareUrl]);

  if (typeof document === "undefined" || !open || !fixture) return null;

  return createPortal(
    <div
      className="match-modal-root match-modal-root--open fixed inset-0 z-50 flex items-end justify-center px-0 py-0 sm:items-center sm:px-6 sm:py-5"
      role="presentation"
    >
      <button
        type="button"
        className="match-modal-backdrop absolute inset-0"
        aria-label="Close match analysis"
        onClick={onClose}
      />

      <div
        key={fixture.id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="match-modal-panel match-modal-panel--open light-surface light-card relative z-10 flex h-[var(--match-modal-height)] max-h-[var(--match-modal-height)] w-full max-w-[var(--match-modal-width)] flex-col overflow-hidden rounded-t-2xl sm:rounded-xl"
      >
        <div
          className="absolute inset-x-0 top-2 z-10 flex justify-center sm:hidden"
          aria-hidden
        >
          <span className="h-1 w-10 rounded-full bg-amber-600/25" />
        </div>

        <header className="match-modal-tile-header relative flex shrink-0 items-center gap-1.5 px-4 pb-3 pt-[calc(1.5rem+2px)] sm:justify-center sm:px-5 sm:pb-3.5 sm:pt-[calc(1.25rem+2px)]">
          {shareUrl && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className={[
                "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all focus:outline-none focus-visible:ring-2 sm:hidden",
                "border-0 bg-transparent text-amber-950 shadow-none hover:text-amber-950 focus-visible:ring-amber-700/35",
                shareLabel ? "text-emerald-800" : "",
              ].join(" ")}
              aria-label={shareLabel ?? "Share this match analysis"}
            >
              <ShareIcon />
            </button>
          )}
          <p
            id={titleId}
            className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-1.5 overflow-hidden text-center sm:flex-none sm:max-w-full sm:gap-2 sm:px-24"
          >
            <TeamName
              name={fixture.home}
              showFlag
              showRank
              rankSpacing="compact"
              nameClassName="text-sm font-semibold leading-tight text-slate-900 sm:text-xl"
              rankClassName="text-[10px] font-semibold tabular-nums text-slate-400 sm:text-sm"
              flagClassName="inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-base leading-none ring-1 ring-slate-200 sm:h-7 sm:w-9 sm:text-xl"
              className="inline-flex min-w-0 items-center gap-1 sm:gap-2"
            />
            <span className="shrink-0 text-xs font-semibold text-slate-400 sm:text-lg">vs</span>
            <TeamName
              name={fixture.away}
              showFlag
              showRank
              rankSpacing="compact"
              nameClassName="text-sm font-semibold leading-tight text-slate-900 sm:text-xl"
              rankClassName="text-[10px] font-semibold tabular-nums text-slate-400 sm:text-sm"
              flagClassName="inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-base leading-none ring-1 ring-slate-200 sm:h-7 sm:w-9 sm:text-xl"
              className="inline-flex min-w-0 items-center gap-1 sm:gap-2"
            />
          </p>
          <div className="flex shrink-0 items-center gap-1.5 sm:absolute sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:gap-3">
            {shareUrl && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className={[
                  "hidden size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all focus:outline-none focus-visible:ring-2 sm:inline-flex",
                  "border border-amber-200/90 bg-white/80 text-amber-950 shadow-sm hover:border-amber-300/80 hover:bg-amber-50/90 hover:text-amber-950 hover:shadow focus-visible:ring-amber-600/30",
                  shareLabel ? "border-emerald-800/30 bg-emerald-100 text-emerald-950" : "",
                ].join(" ")}
                aria-label={shareLabel ?? "Share this match analysis"}
              >
                <ShareIcon />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-amber-900 shadow-none transition-all hover:text-amber-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/30 sm:border sm:border-amber-200/90 sm:bg-white/80 sm:text-amber-950 sm:shadow-sm sm:hover:border-amber-300/80 sm:hover:bg-amber-50/90 sm:hover:text-amber-950 sm:hover:shadow"
              aria-label="Close match analysis"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="match-modal-scroll-wrap min-h-0 flex-1">
          <div className="match-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-3 sm:px-6 sm:pb-7 sm:pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8M16 6l-4-4-4 4M12 2v13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
