import { flagFor } from "@/lib/flags";
import { fifaRankFor, formatFifaRank } from "@/lib/fifa-rankings";

type Props = {
  name: string;
  showFlag?: boolean;
  showRank?: boolean;
  /** Gap between country name and FIFA rank. */
  rankSpacing?: "compact" | "comfortable";
  /** Tailwind classes on the country name. */
  nameClassName?: string;
  /** Tailwind classes on the FIFA rank badge. */
  rankClassName?: string;
  className?: string;
};

const rankSpacingClass = {
  compact: "-ml-1.5",
  comfortable: "ml-1.5",
} as const;

export function TeamName({
  name,
  showFlag = false,
  showRank = false,
  rankSpacing = "compact",
  nameClassName = "",
  rankClassName = "text-[10px] font-semibold tabular-nums text-slate-400",
  className = "inline-flex min-w-0 items-baseline gap-0",
}: Props) {
  const rank = showRank ? fifaRankFor(name) : null;

  return (
    <span className={className}>
      {showFlag && (
        <span
          aria-hidden
          className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-base leading-none ring-1 ring-slate-200"
        >
          {flagFor(name)}
        </span>
      )}
      <span className={["min-w-0 truncate", nameClassName].filter(Boolean).join(" ")}>
        {name}
      </span>
      {rank != null && (
        <span
          className={[
            "shrink-0",
            rankSpacingClass[rankSpacing],
            rankClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {formatFifaRank(rank)}
        </span>
      )}
    </span>
  );
}
