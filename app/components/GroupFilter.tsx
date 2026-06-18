"use client";

import { groupLetter, listFixtureGroups } from "@/lib/fixture-groups";
import { trackGroupFilterChange } from "@/lib/analytics";
import type { Fixture } from "@/lib/fixtures";
import { useMemo } from "react";

type Props = {
  fixtures: Fixture[];
  value: string;
  onChange: (group: string) => void;
};

export function GroupFilter({ fixtures, value, onChange }: Props) {
  const groups = useMemo(() => listFixtureGroups(fixtures), [fixtures]);

  if (groups.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="group-filter"
        className="hidden text-[11px] font-semibold text-slate-200 sm:inline"
      >
        Filter Group
      </label>
      <select
        id="group-filter"
        value={value}
        onChange={(e) => {
          const group = e.target.value;
          trackGroupFilterChange(group);
          onChange(group);
        }}
        className="light-card light-surface cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <option value="all">All</option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {groupLetter(group)}
          </option>
        ))}
      </select>
    </div>
  );
}
