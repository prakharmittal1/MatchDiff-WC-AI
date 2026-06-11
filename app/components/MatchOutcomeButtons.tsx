import { polyPillStyle, type OutcomeSide } from "@/lib/odds-colors";

type Props = {
  teamA: string;
  teamB: string;
  teamAPrice: number;
  drawPrice?: number | null;
  teamBPrice?: number | null;
};

function abbrev(team: string): string {
  const parts = team.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

/** Polymarket-style win / draw / win pills for the match grid. */
export function MatchOutcomeButtons({ teamA, teamB, teamAPrice, drawPrice, teamBPrice }: Props) {
  const threeWay =
    drawPrice != null &&
    teamBPrice != null &&
    Number.isFinite(drawPrice) &&
    Number.isFinite(teamBPrice);

  return (
    <div className="flex shrink-0 gap-1.5">
      <Pill label={abbrev(teamA)} value={teamAPrice} variant="home" />
      {threeWay && (
        <>
          <Pill label="DRAW" value={drawPrice} variant="draw" />
          <Pill label={abbrev(teamB)} value={teamBPrice} variant="away" />
        </>
      )}
    </div>
  );
}

function Pill({ label, value, variant }: { label: string; value: number; variant: OutcomeSide }) {
  if (value == null || !Number.isFinite(value)) return null;
  const isDraw = variant === "draw";
  const fill = polyPillStyle(value, variant);
  const cents = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <span
      className="flex h-[3.25rem] w-[3.1rem] flex-col items-center justify-center gap-0 rounded-xl tabular-nums ring-1 ring-black/5"
      style={{
        backgroundColor: fill.backgroundColor,
        color: fill.color,
        boxShadow: fill.boxShadow,
        borderColor: fill.borderColor,
      }}
    >
      <span
        className={[
          "text-[9px] font-semibold uppercase leading-none tracking-wide",
          isDraw ? "text-zinc-500" : "opacity-90",
        ].join(" ")}
        style={isDraw ? undefined : { color: fill.color }}
      >
        {label}
      </span>
      <span
        className="inline-flex items-baseline gap-px font-bold leading-none"
        style={{ color: isDraw ? "#18181b" : fill.color }}
      >
        <span className="text-base tabular-nums">{cents}</span>
        <span className="text-sm font-semibold">¢</span>
      </span>
    </span>
  );
}
