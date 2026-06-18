import { track } from "@vercel/analytics";

/** Custom events for Vercel Web Analytics (client-side only). */
export function trackMatchTileClick(matchId: string) {
  track("match_tile_click", { match_id: matchId });
}

export function trackGroupFilterChange(group: string) {
  track("group_filter_change", { group });
}

export function trackMatchGridLoadMore(visibleCount: number) {
  track("match_grid_load_more", { visible: visibleCount });
}

export function trackMatchGridCollapse() {
  track("match_grid_collapse");
}
