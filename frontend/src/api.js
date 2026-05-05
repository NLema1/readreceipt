const BASE = "/api";

export async function fetchArticles({ minSeverity = 2, outlet, since } = {}) {
  const qs = new URLSearchParams();
  if (minSeverity != null) qs.set("min_severity", minSeverity);
  if (outlet) qs.set("outlet", outlet);
  if (since) qs.set("since", since);
  const r = await fetch(`${BASE}/articles?${qs}`);
  if (!r.ok) throw new Error(`articles: ${r.status}`);
  return r.json();
}

export async function fetchArticle(id) {
  const r = await fetch(`${BASE}/articles/${id}`);
  if (!r.ok) throw new Error(`article ${id}: ${r.status}`);
  return r.json();
}

export async function fetchRecentChanges({ minSeverity = 2, outlet, since } = {}) {
  const qs = new URLSearchParams();
  if (minSeverity != null) qs.set("min_severity", minSeverity);
  if (outlet) qs.set("outlet", outlet);
  if (since) qs.set("since", since);
  const r = await fetch(`${BASE}/changes/recent?${qs}`);
  if (!r.ok) throw new Error(`changes: ${r.status}`);
  return r.json();
}
