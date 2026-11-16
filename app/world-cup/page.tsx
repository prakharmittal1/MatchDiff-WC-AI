import { Dashboard } from "@/app/components/Dashboard";
import { getCachedArchiveFixtures } from "@/lib/live-fixtures";

type PageProps = {
  searchParams: Promise<{ match?: string }>;
};

export const metadata = {
  title: "World Cup archive · MatchDiff",
  description:
    "Browse MatchDiff as it looked during FIFA World Cup 2026: fixtures, illustrative FIFA-rank odds, and model reads.",
};

export default async function WorldCupArchivePage({ searchParams }: PageProps) {
  const [{ match: initialMatchId }, bootstrap] = await Promise.all([
    searchParams,
    getCachedArchiveFixtures(),
  ]);

  return (
    <Dashboard
      fixtures={bootstrap.fixtures}
      initialMatchId={initialMatchId ?? null}
      mode="archive"
    />
  );
}
