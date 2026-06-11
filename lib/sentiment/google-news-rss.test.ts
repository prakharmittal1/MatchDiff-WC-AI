import { describe, expect, it } from "vitest";

import { parseGoogleNewsRss } from "@/lib/sentiment/google-news-rss";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<item>
<title>Mexico look strong ahead of World Cup opener - ESPN</title>
<link>https://news.google.com/rss/articles/abc</link>
<pubDate>Mon, 09 Jun 2026 12:00:00 GMT</pubDate>
<description>Mexico enter the tournament with momentum.</description>
</item>
<item><title>Short</title><link>https://example.com/x</link></item>
</channel>
</rss>`;

describe("parseGoogleNewsRss", () => {
  it("extracts titles, links, and descriptions", () => {
    const entries = parseGoogleNewsRss(SAMPLE);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toContain("Mexico look strong");
    expect(entries[0]?.url).toContain("google.com");
    expect(entries[0]?.description).toContain("momentum");
  });
});
