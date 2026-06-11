import { fetchGoogleNewsRss, isGoogleNewsRssEnabled } from "@/lib/sentiment/google-news-rss";
import { fetchJson } from "@/lib/sentiment/http";
import { newsPreviewQuery, newsSearchQuery, searchTermsForTeam } from "@/lib/sentiment/query";
import { isSoccerOrFootballNews } from "@/lib/sentiment/soccer-filter";
import type { RawSentimentItem, SentimentSourceStatus } from "@/lib/sentiment/types";
import type { Wc2026Team } from "@/lib/teams";

type GNewsResponse = {
  articles?: Array<{
    title?: string;
    description?: string;
    url?: string;
    publishedAt?: string;
  }>;
};

type NewsApiResponse = {
  articles?: Array<{
    title?: string;
    description?: string;
    url?: string;
    publishedAt?: string;
  }>;
};

export function isGNewsConfigured(): boolean {
  return Boolean(process.env.GNEWS_API_KEY?.trim());
}

export function isNewsApiConfigured(): boolean {
  return Boolean(process.env.NEWS_API_KEY?.trim());
}

export function isNewsConfigured(): boolean {
  return isGNewsConfigured() || isNewsApiConfigured() || isGoogleNewsRssEnabled();
}

const GENERIC_HEADLINE_PATTERNS = [
  /how to watch/i,
  /where to watch/i,
  /kick-?off time/i,
  /kickoff time/i,
  /full schedule/i,
  /complete schedule/i,
  /all \d+\s+matches/i,
  /every match/i,
  /time zone/i,
  /time are world cup.*matches in my/i,
  /\btv\b.*\bstream/i,
  /streaming guide/i,
  /broadcast (info|schedule|details)/i,
  /live stream/i,
  /world cup 2026: full/i,
  /world cup: full/i,
  /watch every/i,
  /match times in/i,
];

/** TV guides and schedule roundups — not useful for match sentiment. */
export function isGenericHeadline(text: string): boolean {
  return GENERIC_HEADLINE_PATTERNS.some((re) => re.test(text));
}

function mentionsTeam(text: string, team: Wc2026Team): boolean {
  const lower = text.toLowerCase();
  return searchTermsForTeam(team).some((term) => lower.includes(term.toLowerCase()));
}

function relevanceScore(text: string, home: Wc2026Team, away: Wc2026Team): number {
  if (isGenericHeadline(text)) return -10;
  if (!isSoccerOrFootballNews(text, { home, away })) return -10;

  const lower = text.toLowerCase();
  const hasHome = mentionsTeam(lower, home);
  const hasAway = mentionsTeam(lower, away);

  let score = 0;
  if (hasHome) score += 2;
  if (hasAway) score += 2;
  if (hasHome && hasAway) score += 3;
  if (/\b(vs\.?|v\.|versus|face off|clash|opener|fixture|matchup|meeting)\b/i.test(lower)) score += 1.5;
  if (/\b(world cup|fifa)\b/i.test(lower)) score += 1;
  if (/\b(preview|prediction|odds|injury|lineup|doubt|analysis|favou?rite|underdog|surprise)\b/i.test(lower))
    score += 1.5;

  return score;
}

function rankAndFilter(
  items: RawSentimentItem[],
  home: Wc2026Team,
  away: Wc2026Team,
): RawSentimentItem[] {
  const scored = items
    .map((item) => {
      const text = [item.title ?? "", item.text].join(" ");
      const score = relevanceScore(text, home, away);
      return { ...item, score };
    })
    .filter((item) => (item.score ?? 0) >= 4)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return scored.slice(0, 8);
}

async function fetchGNews(
  home: Wc2026Team,
  away: Wc2026Team,
): Promise<{ items: RawSentimentItem[]; error?: string }> {
  const key = process.env.GNEWS_API_KEY?.trim();
  if (!key) return { items: [], error: "skipped" };

  const q = newsSearchQuery(home, away);
  const params = new URLSearchParams({
    q,
    lang: "en",
    max: "12",
    apikey: key,
  });

  const result = await fetchJson<GNewsResponse>(`https://gnews.io/api/v4/search?${params}`);

  if (!result.ok) {
    return { items: [], error: `GNews failed (${result.status})` };
  }

  const items: RawSentimentItem[] = [];
  for (const a of result.data.articles ?? []) {
    const title = a.title?.trim() ?? "";
    const desc = a.description?.trim() ?? "";
    const text = [title, desc].filter(Boolean).join(" — ");
    if (text.length < 12) continue;
    items.push({
      source: "news",
      text: text.slice(0, 500),
      title,
      url: a.url,
      at: a.publishedAt,
    });
  }
  return { items };
}

async function fetchNewsApi(
  home: Wc2026Team,
  away: Wc2026Team,
): Promise<{ items: RawSentimentItem[]; error?: string }> {
  const key = process.env.NEWS_API_KEY?.trim();
  if (!key) return { items: [], error: "skipped" };

  const q = newsSearchQuery(home, away);
  const params = new URLSearchParams({
    q,
    language: "en",
    sortBy: "publishedAt",
    pageSize: "12",
    apiKey: key,
  });

  const result = await fetchJson<NewsApiResponse>(`https://newsapi.org/v2/everything?${params}`);

  if (!result.ok) {
    return { items: [], error: `NewsAPI failed (${result.status})` };
  }

  const items: RawSentimentItem[] = [];
  for (const a of result.data.articles ?? []) {
    const title = a.title?.trim() ?? "";
    const desc = a.description?.trim() ?? "";
    const text = [title, desc].filter(Boolean).join(" — ");
    if (text.length < 12) continue;
    items.push({
      source: "news",
      text: text.slice(0, 500),
      title,
      url: a.url,
      at: a.publishedAt,
    });
  }
  return { items };
}

function sourceStatus(
  id: SentimentSourceStatus["id"],
  label: string,
  result: { items: RawSentimentItem[]; error?: string },
): SentimentSourceStatus {
  if (result.error === "skipped") {
    return {
      id,
      label,
      status: "skipped",
      count: 0,
      detail: id === "news" ? "No news source enabled" : undefined,
    };
  }
  if (result.error) {
    return { id, label, status: "error", count: 0, detail: result.error };
  }
  return { id, label, status: "ok", count: result.items.length };
}

function dedupeItems(items: RawSentimentItem[]): RawSentimentItem[] {
  const seen = new Set<string>();
  const out: RawSentimentItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${(item.url ?? item.text).slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function fetchNewsSentiment(
  home: Wc2026Team,
  away: Wc2026Team,
): Promise<{ items: RawSentimentItem[]; sources: SentimentSourceStatus[] }> {
  if (!isNewsConfigured()) {
    return {
      items: [],
      sources: [
        {
          id: "news",
          label: "News",
          status: "skipped",
          count: 0,
          detail: "Enable Google News RSS (default) or add GNEWS_API_KEY / NEWS_API_KEY",
        },
      ],
    };
  }

  const [gnews, newsapi, rssBroad, rssPreview] = await Promise.all([
    fetchGNews(home, away),
    fetchNewsApi(home, away),
    fetchGoogleNewsRss(home, away, newsSearchQuery(home, away)),
    fetchGoogleNewsRss(home, away, newsPreviewQuery(home, away)),
  ]);

  const rss = {
    items: [...rssBroad.items, ...rssPreview.items],
    error: rssBroad.error && rssPreview.error ? rssBroad.error : undefined,
  };

  const sources: SentimentSourceStatus[] = [];
  if (isGNewsConfigured()) {
    sources.push(sourceStatus("news", "GNews", gnews));
  }
  if (isNewsApiConfigured()) {
    sources.push(sourceStatus("news", "NewsAPI", newsapi));
  }
  if (isGoogleNewsRssEnabled()) {
    sources.push(sourceStatus("news", "Google News", rss));
  }

  const items = rankAndFilter(
    dedupeItems([...gnews.items, ...newsapi.items, ...rss.items]),
    home,
    away,
  );

  if (items.length === 0 && sources.every((s) => s.status === "error")) {
    return { items, sources };
  }

  if (items.length > 0) {
    return {
      items,
      sources: [
        {
          id: "news",
          label: "News",
          status: "ok",
          count: items.length,
        },
      ],
    };
  }

  return { items, sources };
}
