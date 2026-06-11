import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WC26 AI Match Analyst · USA · Canada · Mexico",
  description:
    "Multi-source RAG agent for World Cup 2026 — team ratings, match history, venue, news, and Polymarket odds synthesized by an LLM.",
  applicationName: "WC26 AI Match Analyst",
  keywords: [
    "World Cup 2026",
    "FIFA",
    "RAG",
    "LLM",
    "AI analyst",
    "Polymarket",
    "soccer",
    "football",
    "win probability",
  ],
};

export const viewport: Viewport = {
  themeColor: "#2a2f36",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
