/**
 * Pre-fetch news headlines for dashboard fixtures (warms file cache).
 *
 *   npm run sentiment:ingest
 *
 * Google News RSS works with no keys. Optional: GNEWS_API_KEY / NEWS_API_KEY — see README.
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

import { loadDashboardFixtures } from "@/lib/live-fixtures";
import { gatherMatchSentiment, isSentimentConfigured } from "@/lib/sentiment/gather";
import { canonicalizeTeam } from "@/lib/teams";

async function main() {
  if (!isSentimentConfigured()) {
    console.error(
      "No sentiment sources enabled. Google News RSS is on by default; add GNEWS_API_KEY / NEWS_API_KEY for richer results (see README).",
    );
    process.exit(1);
  }

  const { fixtures } = await loadDashboardFixtures();
  console.log(`Warming sentiment cache for ${fixtures.length} fixtures…`);

  let ok = 0;
  let empty = 0;

  for (const f of fixtures) {
    const home = canonicalizeTeam(f.home);
    const away = canonicalizeTeam(f.away);
    if (!home || !away) continue;

    const snap = await gatherMatchSentiment(home, away, f.kickoff_iso, {
      useCache: false,
    });
    if (!snap) continue;
    if (snap.post_count > 0) {
      ok += 1;
      console.log(`  ✓ ${f.home} vs ${f.away}: ${snap.post_count} posts`);
    } else {
      empty += 1;
      console.log(`  · ${f.home} vs ${f.away}: none`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`Done. ${ok} with posts, ${empty} empty. Cache: data/processed/sentiment-cache/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
