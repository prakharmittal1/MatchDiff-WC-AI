"use client";

import { fixtureRound, groupLetter, listFixtureStages } from "@/lib/fixture-groups";
import { trackGroupFilterChange } from "@/lib/analytics";
import type { Fixture } from "@/lib/fixtures";
import { useMemo } from "react";

type Props = {
  fixtures: Fixture[];
  value: string;
  onChange: (stage: string) => void;
};

function stageLabel(stage: string): string {
  if (stage.startsWith("Group ")) return groupLetter(stage);
  return stage;
}

export function GroupFilter({ fixtures, value, onChange }: Props) {
  const stages = useMemo(() => listFixtureStages(fixtures), [fixtures]);
  const hasKnockout = useMemo(
    () => fixtures.some((f) => fixtureRound(f.competition) != null),
    [fixtures],
  );

  if (stages.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="stage-filter"
        className="hidden text-[11px] font-semibold text-slate-200 sm:inline"
      >
        {hasKnockout ? "Filter stage" : "Filter group"}
      </label>
      <select
        id="stage-filter"
        value={value}
        onChange={(e) => {
          const stage = e.target.value;
          trackGroupFilterChange(stage);
          onChange(stage);
        }}
        className="light-card light-surface max-w-[11rem] cursor-pointer truncate rounded-lg px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:max-w-none"
      >
        <option value="all">All</option>
        {stages.map((stage) => (
          <option key={stage} value={stage}>
            {stageLabel(stage)}
          </option>
        ))}
      </select>
    </div>
  );
}
