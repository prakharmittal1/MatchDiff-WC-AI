<p align="center">
  <strong>WC26 AI Match Analyst</strong><br />
  <sub>Multi-source RAG agent — ratings, history, venue, news, and Polymarket odds synthesized by an LLM.</sub>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#screenshot">Screenshot</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#api">API</a>
</p>

---

## Screenshot

<p align="center">
  <img src="docs/screenshot.png" alt="WC26 AI Match Analyst — match grid and AI breakdown panel" width="920" />
</p>

<p align="center">
  <em>Tap any match to run the analyst: RAG retrieval, news headlines, venue context, structured LLM reasoning, and a verdict vs Polymarket.</em>
</p>

---

## Quick start

Works with **no API keys** for the match grid and Elo baseline. For the full AI demo, run **Ollama locally** or add a Gemini key.

```bash
git clone <your-repo-url>
cd wc26-alpha-agent
npm install

# Optional — local LLM (recommended for demos)
ollama pull llama3.2
# Add to .env.local: LLM_PROVIDER=ollama

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → tap a match → see **AI estimate**, **reasoning steps**, and market comparison.

Optional features use a **local** `.env.local` file (never committed). See [Configuration](#configuration).

---

## How it works

This is an **agent-style analysis pipeline**, not a single model call. Each `POST /api/analyze` run:

```
Fixtures + Polymarket odds
        ↓
┌───────────────────────────────────────┐
│  Retrieval & context                  │
│  · Elo ratings (data/results.csv)     │
│  · RAG — keyword search over H2H      │
│  · Quant factors — rest, form,        │
│      squad value, injuries            │
│  · Venue — altitude, heat, travel       │
│  · News + injuries — Google News RSS  │
│  · Market — live Polymarket prices      │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  LLM analyst (Ollama / Gemini)        │
│  Structured output: p_expected,         │
│  thinking_steps, risks, trade thesis    │
└───────────────────────────────────────┘
        ↓
Verdict vs Polymarket + UI breakdown
```

| Layer | What it does |
|-------|----------------|
| **Elo + H2H** | Quantitative baseline |
| **Quant factors** | Rest-days asymmetry, exponentially-weighted recent form, squad market value, injury penalties — each a signed Elo nudge folded into `p_model` |
| **RAG** | Retrieves past international results for both teams |
| **Venue** | WC26 host-city profiles — altitude, climate, travel |
| **News + injuries** | Recent headlines + parsed squad news fed into the LLM prompt |
| **Polymarket** | Live home / draw / away prices |
| **AI analyst** | Synthesizes all inputs → **AI estimate** (`p_expected`) with reasoning |

### Quantitative factors

Each factor produces a signed **Elo-point delta** (home perspective); they sum (capped at ±120) and fold into the win-probability baseline:

| Factor | Source | Live or historical |
|--------|--------|--------------------|
| Rest-days asymmetry | WC26 schedule gaps | Live only |
| Recent form | Exp.-weighted last 10 results (`recent-form.json`) | Both |
| Squad market value | `data/squad-values.json` (curated, editable) | Live (today's values) |
| Injuries | `data/injuries-curated.json` + Google News parsing | Live only |

Without the LLM, the UI falls back to **Elo + history** or **Elo baseline** — clearly labeled on the stat tile.

The LLM uses a **Zod schema** (structured generation) — probability, headline, step-by-step reasoning, risks, and stance vs market. Not a chatbot.

---

## Configuration

All secrets stay in `.env.local` on your machine. The repo does not ship an env template file.

### Always free (no keys)

| Data | Source |
|------|--------|
| Match list & odds | [Polymarket](https://polymarket.com/sports/fifa-world-cup/games) Gamma API |
| News headlines | Google News RSS (on by default) |
| Schedule fallback | `FOOTBALL_DATA_ORG_TOKEN` — [football-data.org](https://www.football-data.org/client/register) |

### History & RAG (recommended)

```bash
# 1. Download Kaggle CSV → data/results.csv (gitignored)
# 2. Build Elo ratings + RAG chunks
npm run data:build -- --file data/results.csv

# Refresh official host cities
npm run wc26:venues
```

### AI analyst (pick one)

**Ollama (local — best for demos)**

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | Set to `ollama` |
| `OLLAMA_MODEL` | e.g. `llama3.2` |
| `OLLAMA_BASE_URL` | Default `http://127.0.0.1:11434/api` |
| `LLM_CACHE_TTL_MS` | Cache LLM responses (default 6 hours) to reduce token usage |

**Gemini (cloud)**

| Variable | Purpose |
|----------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_ANALYST_MODEL` | Optional model override |
| `LLM_PROVIDER` | Set to `gemini` if both keys present |

Disable per request: `"include_llm": false` on `POST /api/analyze`.

### API usage safeguards

For public deployments (free-tier friendly):

| Variable | Purpose |
|----------|---------|
| `ANALYZE_RATE_LIMIT_MAX` | Max `/api/analyze` calls per IP in each window (default 20) |
| `ANALYZE_RATE_LIMIT_WINDOW_MS` | Rate-limit window size in ms (default 60,000) |

The server also caches repeated LLM analyses by model + prompt content to cut token/compute spend.

### News headlines (optional upgrades)

| Source | Setup |
|--------|--------|
| **Google News RSS** | On by default — no API key. Set `SENTIMENT_GOOGLE_NEWS_RSS=0` to disable. |
| **GNews** | `GNEWS_API_KEY` — [gnews.io](https://gnews.io/) (free tier) |
| **NewsAPI** | `NEWS_API_KEY` — optional fallback — [newsapi.org](https://newsapi.org/) |

| Variable | Purpose |
|----------|---------|
| `SENTIMENT_CACHE_TTL_MS` | Cache TTL in ms (default **30 minutes**) |
| `SENTIMENT_GOOGLE_NEWS_RSS` | Set `0` / `false` / `off` to skip Google News RSS |
| `GNEWS_API_KEY` | GNews API key |
| `NEWS_API_KEY` | NewsAPI key |

Pre-warm cache:

```bash
npm run sentiment:ingest
```

Disable per request: `"include_sentiment": false`.

---

## Evaluation

`npm run eval` runs an offline walk-forward benchmark on `data/results.csv` and writes
`data/evals/latest.json`.

Current run (split 80/20, 18,747 canonical rows, 3,750 test):

| Model | Brier (lower better) | Log loss (lower better) | Accuracy |
|-------|-----------------------|--------------------------|----------|
| coin flip (0.50) | 0.2500 | 0.6931 | 46.2% |
| elo | 0.2366 | 0.6687 | 61.1% |
| elo_h2h | 0.2380 | 0.6729 | 60.9% |
| **rag_elo_blend** | **0.2304** | **0.6565** | **62.6%** |
| elo_factors | 0.2404 | 0.6863 | 62.3% |

`rag_elo_blend` (Elo + head-to-head + retrieved history) has the best Brier and log loss.

Notes:
- This benchmark is **binary** (home win = 1, otherwise 0), so draws/away wins are merged.
- `elo_factors` adds recent form + squad value. It scores **slightly worse in backtest** because
  squad market values are *current* (no historical record), so applying them to old matches adds
  noise. These factors target **live WC26 fixtures**, where current values are correct.
- `rest-days` and `injuries` are live-only signals and are excluded from the offline benchmark.
- LLM output is not included in offline scoring yet.
- Next step: a 3-way probability evaluator (win / draw / loss).

Run it:

```bash
npm run eval
```

---

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/matches` | GET | Match list + Polymarket prices (~5m cache) |
| `/api/analyze` | POST | Full AI breakdown for one fixture |

**`POST /api/analyze`** — JSON body:

| Field | Required | Notes |
|-------|----------|-------|
| `home`, `away` | yes | Canonical names (`lib/teams.ts`) |
| `kickoff_iso` | yes | ISO datetime |
| `p_market`, `market_draw`, `market_away_win` | no | Client-side odds |
| `polymarket_event_slug` | no | Polymarket event |
| `venue` | no | Stadium / city hint |
| `include_llm` | no | Default on when AI configured |
| `include_sentiment` | no | Default on when news sources enabled |
| `refresh_sentiment` | no | Bypass news/injury cache and re-run the pick |

Response includes `p_expected_source` (`llm` | `rag_elo_blend` | `elo`), `breakdown`, `adjustments` (quant factors), `llm.thinking_steps`, `llm.risks`, `sentiment.injury_reports`, and `verdict`.

---

## Scripts

```bash
npm run dev
npm run build
npm run data:build -- --file data/results.csv
npm run wc26:venues
npm run news:check
npm run sentiment:ingest
npm run eval
npm test
npm run typecheck
```

---

## Project layout

```
app/                    Dashboard, match grid, AI breakdown panel
app/api/                matches + analyze routes
lib/alpha-engine.ts     Agent pipeline orchestrator
lib/rag-search.ts       Keyword RAG over match history
lib/model-factors.ts    Rest / form / squad value / injury Elo deltas
lib/rest-days.ts        Rest-day asymmetry from the schedule
lib/recent-form.ts      Exp.-weighted form loader
lib/llm-analyst.ts      Structured LLM analyst
lib/sentiment/          News + injury fetch & aggregation
lib/match-context.ts    Venue & environment
data/squad-values.json  Curated squad market values (editable)
data/injuries-curated.json  Curated injury overrides (editable)
data/processed/         Elo ratings, RAG chunks, recent form, caches
data/evals/             Offline benchmark outputs
docs/screenshot.png     README preview image
```

---

## Verify the AI demo

| Check | What to expect |
|-------|----------------|
| Stat tile label | **AI estimate** + model badge (e.g. Ollama llama3.2) when LLM runs |
| AI analyst card | Reasoning steps, risks, trade thesis |
| Fallback | **Elo + history** or **Elo baseline** when LLM off |
| RAG | Past meetings listed under Quantitative context |
| News | Headlines panel (Google News RSS works without keys) |
| `npm run news:check` | Sample headlines for Mexico vs South Africa |

---

<p align="center">
  <sub>Built with Next.js · RAG + structured LLM · Not financial advice · Polymarket is a third-party market</sub>
</p>
