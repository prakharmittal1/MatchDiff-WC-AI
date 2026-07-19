export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqSection = {
  title: string;
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "About MatchDiff",
    items: [
      {
        question: "What is MatchDiff?",
        answer:
          "MatchDiff is a free research dashboard for the FIFA World Cup 2026. Each match tile shows live Polymarket win prices; tap a fixture to open our model read, how it compares to the market, and the data behind it (team ratings, form, venue, news, and head-to-head history).",
      },
      {
        question: "Is MatchDiff a sportsbook or exchange?",
        answer:
          "No. We do not take bets, hold funds, or execute trades. MatchDiff is informational only. When you want to trade, you go directly to Polymarket or another venue.",
      },
      {
        question: "Are you affiliated with FIFA or Polymarket?",
        answer:
          "No. MatchDiff is an independent project. FIFA, Polymarket, and other third-party names belong to their respective owners.",
      },
    ],
  },
  {
    title: "How it works",
    items: [
      {
        question: "What do the numbers on each match tile mean?",
        answer:
          "The colored pills are live Polymarket prices for home win, draw, and away win, shown in cents (for example, 58¢ ≈ 58% implied probability). They update from Polymarket’s public API.",
      },
      {
        question: "What is “MatchDiff” in the analysis modal?",
        answer:
          "That is our model’s fair win probability for the home team, after combining team ratings, recent form, squad value, injuries, venue context, news, and (when configured) an AI analyst pass. We show it next to the Polymarket price and the gap between them.",
      },
      {
        question: "How is the analysis generated?",
        answer:
          "Each request runs a pipeline: Elo ratings and head-to-head history, quant factors (rest, form, squad value, injuries), RAG over past meetings, WC26 venue notes, Google News headlines, a Polymarket quote, then an optional LLM synthesis step (Groq, Gemini, or local Ollama). Without an LLM, you still get a quantitative baseline.",
      },
      {
        question: "Can I share a specific match?",
        answer:
          "Yes. Open a match and use the share control, or copy a URL with ?match=<fixture-id> to deep-link the analysis modal.",
      },
    ],
  },
  {
    title: "Polymarket & prediction markets",
    items: [
      {
        question: "What is Polymarket?",
        answer:
          "Polymarket is a prediction market where people trade event contracts (including sports outcomes) at prices that imply probabilities. MatchDiff reads public prices for context; we do not operate the market.",
      },
      {
        question: "Why compare a model to Polymarket?",
        answer:
          "Polymarket aggregates crowd belief in real time. Our pipeline blends structured football data with news and optional AI reasoning. Highlighting the gap helps you see where our read diverges from the market—not a guarantee that either side is “correct.”",
      },
      {
        question: "Do I need an account to use MatchDiff?",
        answer:
          "No account is required to browse fixtures or read analysis. Trading on Polymarket has its own signup, wallet, and regional rules.",
      },
    ],
  },
  {
    title: "AI, data & accuracy",
    items: [
      {
        question: "Do I need API keys?",
        answer:
          "No for the basics: match grid, Elo baseline, and Google News RSS. Add Groq, Gemini, or Ollama only if you want full LLM-written match reads on your deployment.",
      },
      {
        question: "Can the AI be wrong?",
        answer:
          "Yes. AI-generated text and model probabilities can contain errors, especially with thin data or late injury news. Treat every output as one input to your own research, not a signal to bet blindly.",
      },
      {
        question: "Where does the football data come from?",
        answer:
          "Processed Elo and head-to-head indexes are built from historical match CSVs (Kaggle-style results). Squad values and injuries use curated files plus news RSS. WC26 schedule and venues come from official host-city data bundled in the repo.",
      },
    ],
  },
  {
    title: "Legal & responsible use",
    items: [
      {
        question: "Is this financial or betting advice?",
        answer:
          "No. MatchDiff is for informational purposes only and does not constitute financial, investment, or legal advice. Past performance does not guarantee future results. You can lose your entire investment. Always do your own research and consult a qualified financial advisor.",
      },
      {
        question: "Who is responsible for trades I make?",
        answer:
          "You are. We do not facilitate trades or hold funds. Any decision to trade on Polymarket or elsewhere is entirely yours.",
      },
    ],
  },
];
