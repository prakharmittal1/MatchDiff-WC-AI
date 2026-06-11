import type { Wc2026Team } from "@/lib/teams";

export type SentimentTone = "positive" | "mixed" | "negative" | "unknown";

export type SentimentSourceId = "news";

export type SentimentSourceStatus = {
  id: SentimentSourceId;
  label: string;
  status: "ok" | "skipped" | "error";
  count: number;
  detail?: string;
};

export type SentimentQuote = {
  text: string;
  source: SentimentSourceId;
  url?: string;
  at?: string;
};

export type SentimentCoverageQuality = "strong" | "weak" | "none";

export type InjuryStatus = "ruled_out" | "doubtful" | "fit" | "unknown";

export type InjuryReport = {
  team: Wc2026Team;
  player: string | null;
  status: InjuryStatus;
  headline: string;
  url?: string;
  source: "news_rss" | "curated";
  at?: string;
  note?: string;
};

export type SentimentSnapshot = {
  home: Wc2026Team;
  away: Wc2026Team;
  kickoff_iso: string;
  fetched_at: string;
  post_count: number;
  home_tone: SentimentTone;
  away_tone: SentimentTone;
  /** Whether headlines carry real opinion vs schedules / logistics. */
  coverage_quality: SentimentCoverageQuality;
  /** Structured squad news parsed from headlines + curated file. */
  injury_reports: InjuryReport[];
  themes: string[];
  sample_quotes: SentimentQuote[];
  sources: SentimentSourceStatus[];
  /** One plain sentence for the UI. */
  summary_line: string | null;
};

export type RawSentimentItem = {
  source: SentimentSourceId;
  text: string;
  title?: string;
  url?: string;
  score?: number;
  at?: string;
};
