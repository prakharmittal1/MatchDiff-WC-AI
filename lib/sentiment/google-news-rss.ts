import { fetchText } from "@/lib/sentiment/http";
import { newsSearchQuery } from "@/lib/sentiment/query";
import type { RawSentimentItem } from "@/lib/sentiment/types";
import type { Wc2026Team } from "@/lib/teams";

export function isGoogleNewsRssEnabled(): boolean {
  const raw = process.env.SENTIMENT_GOOGLE_NEWS_RSS?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

/** Parse standard RSS 2.0 item blocks (Google News RSS). */
export function parseGoogleNewsRss(xml: string): Array<{
  title: string;
  url?: string;
  at?: string;
  description?: string;
}> {
  const out: Array<{ title: string; url?: string; at?: string; description?: string }> = [];
  for (const chunk of xml.split("<item>")) {
    if (!chunk.includes("</item>")) continue;
    const block = chunk.split("</item>")[0] ?? "";
    const title = extractTag(block, "title");
    if (!title || title.length < 12) continue;
    out.push({
      title,
      url: extractTag(block, "link"),
      at: extractTag(block, "pubDate"),
      description: extractTag(block, "description"),
    });
  }
  return out;
}

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m?.[1]) return undefined;
  return decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchGoogleNewsRss(
  home: Wc2026Team,
  away: Wc2026Team,
  query?: string,
): Promise<{ items: RawSentimentItem[]; error?: string }> {
  if (!isGoogleNewsRssEnabled()) {
    return { items: [], error: "skipped" };
  }

  const q = query ?? newsSearchQuery(home, away);
  const params = new URLSearchParams({
    q,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });

  const result = await fetchText(`https://news.google.com/rss/search?${params}`, {
    headers: {
      "User-Agent": "wc26-match-picks/0.2 (news-rss; local-dev)",
    },
    timeoutMs: 12_000,
  });

  if (!result.ok) {
    return { items: [], error: `Google News RSS failed (${result.status})` };
  }

  const items: RawSentimentItem[] = [];
  for (const entry of parseGoogleNewsRss(result.data).slice(0, 12)) {
    const desc = entry.description?.trim() ?? "";
    const text = [entry.title, desc].filter(Boolean).join(" — ");
    items.push({
      source: "news",
      text: text.slice(0, 500),
      title: entry.title,
      url: entry.url,
      at: entry.at,
    });
  }
  return { items };
}
