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
      setShareLabel("Link copied");
    } catch {
      setShareLabel("Could not copy link");
    }
  }, [fixture, shareText, shareUrl]);

  if (typeof document === "undefined" || !open || !fixture) return null;

  return createPortal(
    <div
      className="match-modal-root match-modal-root--open fixed inset-0 z-50 flex items-end justify-center px-5 py-3 sm:items-center sm:px-6 sm:py-5"
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
        className="match-modal-panel match-modal-panel--open light-surface light-card relative flex h-[var(--match-modal-height)] max-h-[var(--match-modal-height)] w-full max-w-[var(--match-modal-width)] flex-col overflow-hidden rounded-xl"
      >
        <header className="match-modal-tile-header relative flex min-h-[5.5rem] shrink-0 items-center justify-center px-4 py-4">
          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {shareUrl && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
                aria-label="Share this match analysis"
              >
                <ShareIcon />
                {shareLabel ?? "Share"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close match analysis"
            >
              <CloseIcon />
            </button>
          </div>

          <p
            id={titleId}
            className="flex max-w-full flex-nowrap items-center justify-center gap-2 overflow-hidden px-16 text-center"
          >
            <TeamName
              name={fixture.home}
              showFlag
              showRank
              rankSpacing="compact"
              nameClassName="text-lg font-semibold leading-tight text-slate-900"
              rankClassName="text-xs font-semibold tabular-nums text-slate-400"
              className="inline-flex min-w-0 items-center gap-2"
            />
            <span className="shrink-0 text-base font-semibold text-slate-400">vs</span>
            <TeamName
              name={fixture.away}
              showFlag
              showRank
              rankSpacing="compact"
              nameClassName="text-lg font-semibold leading-tight text-slate-900"
              rankClassName="text-xs font-semibold tabular-nums text-slate-400"
              className="inline-flex min-w-0 items-center gap-2"
            />
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 pb-0 pt-0.5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
