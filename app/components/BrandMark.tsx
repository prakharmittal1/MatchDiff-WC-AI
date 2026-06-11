import { flagFor, HOST_NATIONS } from "@/lib/flags";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3.5">
      <svg
        viewBox="0 0 64 64"
        width={52}
        height={52}
        aria-label="World Cup 2026 mark"
        role="img"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="wc26pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="12" fill="url(#wc26pitch)" />
        <circle cx="32" cy="32" r="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="2.5" fill="rgba(255,255,255,0.9)" />
        <line x1="32" y1="4" x2="32" y2="18" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <line x1="32" y1="46" x2="32" y2="60" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fontFamily="var(--font-plex-mono), ui-monospace, monospace"
          fontWeight="600"
          fontSize="13"
          fill="#fbbf24"
        >
          26
        </text>
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          FIFA World Cup
        </span>
        <span className="text-lg font-semibold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:text-xl">
          Betting Advisor
        </span>
        <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-slate-300">
          {HOST_NATIONS.map((h) => (
            <span key={h.tag} className="flex items-center gap-0.5">
              <span aria-hidden className="text-sm leading-none">
                {flagFor(h.team)}
              </span>
              <span>{h.tag}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
