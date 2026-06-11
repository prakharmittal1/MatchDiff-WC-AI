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
  /** Tailwind classes on the flag badge. */
  flagClassName?: string;
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
  flagClassName = "inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-base leading-none ring-1 ring-slate-200",
  className = "",
}: Props) {
  const rank = showRank ? fifaRankFor(name) : null;

  return (
    <span
      className={[
        "inline-flex min-w-0 flex-nowrap items-center gap-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showFlag && (
        <span aria-hidden className={flagClassName}>
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
