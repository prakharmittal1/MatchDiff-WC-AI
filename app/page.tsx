import { Dashboard } from "@/app/components/Dashboard";
import { getCachedDashboardFixtures } from "@/lib/live-fixtures";

type PageProps = {
  searchParams: Promise<{ match?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const [{ match: initialMatchId }, bootstrap] = await Promise.all([
    searchParams,
    getCachedDashboardFixtures(),
  ]);

  return (
    <Dashboard fixtures={bootstrap.fixtures} initialMatchId={initialMatchId ?? null} />
  );
}
