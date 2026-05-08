import { useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import Timeline from "./components/Timeline";
import SvgFilters from "./components/receipt/SvgFilters";
import { fetchArticle, fetchArticles, fetchRecentChanges } from "./api";
import { usePolling } from "./usePolling";
import { ALL_CHANGE_TYPES, ALL_OUTLETS } from "./constants";
import {
  filterArticles,
  filterChanges,
  topVolatile,
} from "./lib/receipt";

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

export default function App() {
  const [filters, setFilters] = useState({
    minSeverity: 2,
    outlets: ALL_OUTLETS,
    changeTypes: ALL_CHANGE_TYPES,
    window: "24h",
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const isUrl = looksLikeUrl(search);
  const queryUrl = isUrl ? normalizeUrlInput(search) : undefined;
  const queryText = !isUrl && search.trim() ? search.trim() : undefined;

  // Server can take a single outlet param; if exactly one outlet is picked we
  // narrow at the API. Otherwise fetch the full set and refine client-side.
  const singleOutletParam =
    filters.outlets.length === 1 && !search ? filters.outlets[0] : undefined;
  const useChangeTypeFilter =
    !search &&
    filters.changeTypes.length > 0 &&
    filters.changeTypes.length < ALL_CHANGE_TYPES.length;

  const articlesQuery = usePolling(
    () =>
      fetchArticles({
        minSeverity: search ? 0 : filters.minSeverity,
        outlet: singleOutletParam,
        since: search ? "all" : sinceParam(filters.window),
        q: queryText,
        url: queryUrl,
        changeTypes: useChangeTypeFilter ? filters.changeTypes : undefined,
      }),
    30_000,
    [
      filters.minSeverity,
      filters.window,
      filters.outlets.join(","),
      filters.changeTypes.join(","),
      queryText,
      queryUrl,
    ]
  );

  const recentChangesQuery = usePolling(
    () =>
      fetchRecentChanges({
        minSeverity: 1,
        outlet: singleOutletParam,
        since: search ? "all" : sinceParam(filters.window),
      }),
    30_000,
    [filters.window, filters.outlets.join(","), queryText, queryUrl]
  );

  const articleQuery = usePolling(
    () => (selectedId ? fetchArticle(selectedId) : Promise.resolve(null)),
    60_000,
    [selectedId]
  );

  const recentChangesAll = recentChangesQuery.data || null;
  const articlesAll = articlesQuery.data || null;

  // Apply filters that the API doesn't fully cover (multi-outlet, multi-type
  // for the changes feed). The dashboard sees only the filtered set.
  const recentChanges = useMemo(
    () =>
      filterChanges(recentChangesAll, {
        outlets: filters.outlets,
        changeTypes: filters.changeTypes,
      }),
    [recentChangesAll, filters.outlets, filters.changeTypes]
  );

  const articles = useMemo(
    () =>
      filterArticles(articlesAll, {
        outlets: filters.outlets,
        changeTypes: filters.changeTypes,
        recentChanges: recentChangesAll,
      }),
    [articlesAll, filters.outlets, filters.changeTypes, recentChangesAll]
  );

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
