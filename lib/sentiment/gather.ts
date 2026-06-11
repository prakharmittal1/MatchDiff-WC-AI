import { buildSentimentSnapshot } from "@/lib/sentiment/aggregate";
import {
  readFileSentimentCache,
  readMemorySentimentCache,
  writeSentimentCache,
} from "@/lib/sentiment/cache";
import { fetchInjuryReports } from "@/lib/sentiment/injuries";
import { fetchNewsSentiment, isNewsConfigured } from "@/lib/sentiment/news";
import type { SentimentSnapshot } from "@/lib/sentiment/types";
import type { Wc2026Team } from "@/lib/teams";

export function isSentimentConfigured(): boolean {
  return isNewsConfigured();
}

export type GatherSentimentOptions = {
  useCache?: boolean;
};

export async function gatherMatchSentiment(
  home: Wc2026Team,
  away: Wc2026Team,
  kickoff_iso: string,
  options: GatherSentimentOptions = {},
): Promise<SentimentSnapshot | null> {
  if (!isSentimentConfigured()) return null;

  const useCache = options.useCache !== false;
  if (useCache) {
    const mem = readMemorySentimentCache(home, away, kickoff_iso);
    if (mem) return mem;
    const file = await readFileSentimentCache(home, away, kickoff_iso);
    if (file) return file;
  }

  const [news, injury_reports] = await Promise.all([
    fetchNewsSentiment(home, away),
    fetchInjuryReports(home, away),
  ]);

  const snapshot = buildSentimentSnapshot(
    home,
    away,
    kickoff_iso,
    news.items,
    news.sources,
    injury_reports,
  );

  if (useCache) {
    await writeSentimentCache(snapshot);
  }

  return snapshot;
}
