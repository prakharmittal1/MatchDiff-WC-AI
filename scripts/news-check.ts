/**
 * Verify news sentiment for a sample WC26 fixture.
 *
 *   npm run news:check
 *
 * Google News RSS works with no API keys (default).
 * Optional: GNEWS_API_KEY and/or NEWS_API_KEY in .env.local.
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

import { gatherMatchSentiment } from "@/lib/sentiment/gather";
import { fetchNewsSentiment, isNewsConfigured } from "@/lib/sentiment/news";
import { isGoogleNewsRssEnabled } from "@/lib/sentiment/google-news-rss";

async function main() {
  if (!isNewsConfigured()) {
    console.error(`
No news sources enabled. By default Google News RSS is on — set SENTIMENT_GOOGLE_NEWS_RSS=0 only to disable.

Optional upgrades in .env.local:
  GNEWS_API_KEY=...   — https://gnews.io/
  NEWS_API_KEY=...    — https://newsapi.org/
`);
    process.exit(1);
  }

  const home = "Mexico";
  const away = "South Africa";
  console.log(`Testing news search: ${home} vs ${away}…`);
  console.log(
    `Sources: Google News RSS ${isGoogleNewsRssEnabled() ? "on" : "off"}, GNews ${process.env.GNEWS_API_KEY ? "on" : "off"}, NewsAPI ${process.env.NEWS_API_KEY ? "on" : "off"}\n`,
  );

  const raw = await fetchNewsSentiment(home, away);
  if (raw.items.length === 0) {
    console.error("No headlines returned.");
    for (const s of raw.sources) {
      if (s.detail) console.error(`  · ${s.label ?? s.id}: ${s.detail}`);
    }
    process.exit(1);
  }

  console.log(`✓ ${raw.items.length} headlines\n`);
  for (const item of raw.items.slice(0, 5)) {
    console.log(`  · ${item.title ?? item.text.slice(0, 80)}`);
    if (item.url) console.log(`    ${item.url}`);
  }

  const snap = await gatherMatchSentiment(home, away, "2026-06-11T19:00:00Z", {
    useCache: false,
  });
  console.log(`\nGather pipeline: ${snap?.post_count ?? 0} headlines`);
  console.log(`Injury reports: ${snap?.injury_reports.length ?? 0}`);
  if (snap?.injury_reports.length) {
    for (const r of snap.injury_reports.slice(0, 3)) {
      console.log(`  · [${r.status}] ${r.team}${r.player ? ` — ${r.player}` : ""}: ${r.headline.slice(0, 70)}`);
    }
  }
  if (snap?.summary_line) {
    console.log(`Summary: ${snap.summary_line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
