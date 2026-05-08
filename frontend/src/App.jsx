import { useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import Timeline from "./components/Timeline";
import SvgFilters from "./components/receipt/SvgFilters";
import { fetchArticle, fetchArticles, fetchRecentChanges } from "./api";
import { usePolling } from "./usePolling";
import { ALL_CHANGE_TYPES } from "./constants";
import { topVolatile } from "./lib/receipt";

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
  "guardian", "bbc", "npr", "aljazeera", "propublica",
  "nbc", "cbs", "thehill", "sky", "fox", "nypost",
];

export default function App() {
  const [filters, setFilters] = useState({
    minSeverity: 2,
    outlets: ALL_OUTLETS,
    changeTypes: ALL_CHANGE_TYPES,
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
        since: search ? "all" : sinceParam(filters.window),
        q: queryText,
        url: queryUrl,
      }),
    30_000,
    [filters.minSeverity, filters.window, queryText, queryUrl]
  );

  const recentChangesQuery = usePolling(
    () =>
      fetchRecentChanges({
        minSeverity: 1,
        since: search ? "all" : sinceParam(filters.window),
      }),
    30_000,
    [filters.window, queryText, queryUrl]
  );

  const articleQuery = usePolling(
    () => (selectedId ? fetchArticle(selectedId) : Promise.resolve(null)),
    60_000,
    [selectedId]
  );

  const articles = useMemo(() => {
    if (!articlesQuery.data) return null;
    return articlesQuery.data;
  }, [articlesQuery.data]);

  const recentChanges = recentChangesQuery.data || null;

  const spotlightId = useMemo(() => {
    const pick = topVolatile(articles || [], recentChanges);
    return pick?.id || null;
  }, [articles, recentChanges]);

  const spotlightQuery = usePolling(
    () => (spotlightId ? fetchArticle(spotlightId) : Promise.resolve(null)),
    60_000,
    [spotlightId]
  );

  const showDetail = selectedId !== null;

  return (
    <>
      <SvgFilters />
      {showDetail ? (
        <Timeline
          article={articleQuery.data}
          loading={articleQuery.loading}
          error={articleQuery.error}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <Dashboard
          articles={articles}
          recentChanges={recentChanges}
          spotlight={spotlightQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          onSelectArticle={setSelectedId}
          loading={articlesQuery.loading || recentChangesQuery.loading}
          error={articlesQuery.error || recentChangesQuery.error}
        />
      )}
    </>
  );
}
