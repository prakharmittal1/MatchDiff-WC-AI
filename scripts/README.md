# scripts/

| Script | Command | Output |
|--------|---------|--------|
| `data-build.ts` | `npm run data:build -- --file data/results.csv` | `data/processed/elo-ratings.json`, `h2h-index.json`, `playbook-chunks.json`, `recent-form.json` |
| `build-wc26-venues.ts` | `npm run wc26:venues` | `data/wc26-match-venues.json` |
| `news-check.ts` | `npm run news:check` | Verify news RSS / API + sample search |
| `sentiment-ingest.ts` | `npm run sentiment:ingest` | Sentiment cache (`data/processed/sentiment-cache/`) |
| `eval.ts` | `npm run eval` | Offline walk-forward metrics (`data/evals/latest.json`) |

See the root [README](../README.md) for setup and API keys (use a local `.env.local`, not committed).
