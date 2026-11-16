import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
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
  title: "MatchDiff · Congratulations Spain",
  description:
    "Spain are FIFA World Cup 2026 champions. Celebrate with MatchDiff, then explore how the dashboard looked during the tournament.",
  applicationName: "MatchDiff",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
  keywords: [
    "World Cup 2026",
    "Spain",
    "FIFA",
    "champions",
    "MatchDiff",
    "Polymarket",
    "soccer",
    "football",
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
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
