import { useMemo, useState } from "react";
import ArticleList from "./components/ArticleList";
import Timeline from "./components/Timeline";
import FilterBar from "./components/FilterBar";
import { fetchArticle, fetchArticles } from "./api";
import { usePolling } from "./usePolling";

function sinceParam(window) {
  if (window === "all") return "all";
  const now = new Date();
  if (window === "24h") return new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  return new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
}

export default function App() {
  const [filters, setFilters] = useState({
    minSeverity: 2,
    outlets: ["guardian", "bbc", "npr"],
    window: "7d",
  });
  const [selectedId, setSelectedId] = useState(null);

  const articlesQuery = usePolling(
    () =>
      fetchArticles({
        minSeverity: filters.minSeverity,
        outlet: filters.outlets.length === 1 ? filters.outlets[0] : undefined,
        since: sinceParam(filters.window),
      }),
    30_000,
    [filters.minSeverity, filters.outlets.join(","), filters.window]
  );

  const articleQuery = usePolling(
    () => (selectedId ? fetchArticle(selectedId) : Promise.resolve(null)),
    60_000,
    [selectedId]
  );

  const articles = useMemo(() => {
    if (!articlesQuery.data) return null;
    if (filters.outlets.length === 0 || filters.outlets.length === 3) return articlesQuery.data;
    return articlesQuery.data.filter((a) => filters.outlets.includes(a.outlet));
  }, [articlesQuery.data, filters.outlets]);

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b border-line flex items-baseline justify-between">
        <div className="text-text font-mono text-lg">NewsDiff</div>
      </header>
      <FilterBar filters={filters} onChange={setFilters} />
      <main className="flex-1 grid grid-cols-[360px_1fr] overflow-hidden">
        <aside className="border-r border-line overflow-auto">
          <ArticleList
            articles={articles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={articlesQuery.loading}
            error={articlesQuery.error}
          />
        </aside>
        <section className="overflow-hidden">
          <Timeline
            article={articleQuery.data}
            loading={articleQuery.loading}
            error={articleQuery.error}
          />
        </section>
      </main>
    </div>
  );
}
