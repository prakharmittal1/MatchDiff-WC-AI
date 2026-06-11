import { SoccerLoadingLine } from "@/app/components/SoccerLoadingLine";

export function LoadingSpinner() {
  return (
    <div
      className="flex min-h-[calc(var(--match-modal-height)-10rem)] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
      role="status"
      aria-label="Analyzing match"
    >
      <div
        className="size-10 animate-spin rounded-full border-[3px] border-[#b0c9b8] border-t-[#1f4532]"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-800">Building your match read…</p>
      <SoccerLoadingLine className="max-w-xs text-sm leading-relaxed text-slate-500" />
    </div>
  );
}
