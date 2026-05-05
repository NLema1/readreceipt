import { useMemo, useState } from "react";
import ArticleList from "./components/ArticleList";
import Timeline from "./components/Timeline";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import { fetchArticle, fetchArticles } from "./api";
import { usePolling } from "./usePolling";

function sinceParam(window) {
  if (window === "all") return "all";
  const now = new Date();
  if (window === "24h") return new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  return new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
}

function looksLikeUrl(s) {
  const trimmed = s.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

function normalizeUrlInput(s) {
  const trimmed = s.trim();
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const ALL_OUTLETS = [
  "guardian", "bbc", "npr",
  "aljazeera", "propublica", "nbc", "cbs", "thehill", "sky",
  "fox", "nypost",
];

export default function App() {
  const [filters, setFilters] = useState({
    minSeverity: 2,
    outlets: ALL_OUTLETS,
    window: "7d",
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const isUrl = looksLikeUrl(search);
  const queryUrl = isUrl ? normalizeUrlInput(search) : undefined;
  const queryText = !isUrl && search.trim() ? search.trim() : undefined;

  const articlesQuery = usePolling(
    () =>
      fetchArticles({
        minSeverity: search ? 0 : filters.minSeverity,
        outlet:
          filters.outlets.length === 1 && !search ? filters.outlets[0] : undefined,
        since: search ? "all" : sinceParam(filters.window),
        q: queryText,
        url: queryUrl,
      }),
    30_000,
    [
      filters.minSeverity,
      filters.outlets.join(","),
      filters.window,
      queryText,
      queryUrl,
    ]
  );

  const articleQuery = usePolling(
    () => (selectedId ? fetchArticle(selectedId) : Promise.resolve(null)),
    60_000,
    [selectedId]
  );

  const articles = useMemo(() => {
    if (!articlesQuery.data) return null;
    if (search) return articlesQuery.data;
    if (
      filters.outlets.length === 0 ||
      filters.outlets.length === ALL_OUTLETS.length
    )
      return articlesQuery.data;
    return articlesQuery.data.filter((a) => filters.outlets.includes(a.outlet));
  }, [articlesQuery.data, filters.outlets, search]);

  const showUrlNotTracked =
    isUrl && articlesQuery.data && articlesQuery.data.length === 0 && !articlesQuery.loading;

  const showRight = selectedId !== null;
  const leftHidden = showRight ? "hidden md:flex" : "flex";
  const leftHiddenBlock = showRight ? "hidden md:block" : "block";
  const rightHidden = showRight ? "block" : "hidden md:block";

  return (
    <div className="h-full flex flex-col">
      <header className={`px-4 py-3 border-b border-line items-center gap-4 ${leftHidden}`}>
        <div className="text-text font-mono text-lg">ReadReceipt</div>
        <SearchBar value={search} onChange={setSearch} isUrl={isUrl} />
      </header>
      <div className={leftHiddenBlock}>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>
      {showUrlNotTracked && (
        <div className={`px-4 py-2 border-b border-line text-sm text-muted ${leftHiddenBlock}`}>
          That URL isn't currently tracked. Try a headline search instead, or wait until it's picked up by an RSS feed.
        </div>
      )}
      <main className="flex-1 min-h-0 flex md:grid md:grid-cols-[480px_1fr] overflow-hidden">
        <aside className={`flex-1 md:flex-none md:border-r border-line overflow-y-auto ${leftHiddenBlock}`}>
          <ArticleList
            articles={articles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={articlesQuery.loading}
            error={articlesQuery.error}
          />
        </aside>
        <section className={`flex-1 md:flex-none overflow-hidden ${rightHidden}`}>
          <Timeline
            article={articleQuery.data}
            loading={articleQuery.loading}
            error={articleQuery.error}
            onClose={() => setSelectedId(null)}
          />
        </section>
      </main>
    </div>
  );
}
