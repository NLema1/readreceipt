import { OUTLET_LABELS } from "../components/receipt/OutletStamp";

const TYPE_COLOR = {
  headline_change: "red",
  fact_change: "red",
  quote_change: "amber",
  source_removed: "amber",
  deletion: "amber",
  addition: "ink",
  temporal_update: "blue",
  routine_update: "blue",
  other: "blue",
};

const TYPE_LABEL = {
  headline_change: "HEADLINE",
  fact_change: "FACT",
  quote_change: "QUOTE",
  source_removed: "SOURCE",
  deletion: "DELETION",
  addition: "ADDITION",
  temporal_update: "TEMPORAL",
  routine_update: "ROUTINE",
  other: "OTHER",
};

export function typeLabel(t) {
  return TYPE_LABEL[t] || (t || "OTHER").toUpperCase();
}

export function typeColor(t) {
  return TYPE_COLOR[t] || "blue";
}

function hexId(id) {
  const n = Number(id) || 0;
  return n.toString(16).padStart(4, "0").slice(-4);
}

function ymd(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function serialFor(article) {
  if (!article) return "RR-—";
  const date = ymd(article.first_seen || article.last_checked);
  return `RR-${date}-${hexId(article.id)}`;
}

export function shortSerial(article) {
  if (!article) return "RR-…-0000";
  return `RR-…-${hexId(article.id)}`;
}

// Volatility for a fully-loaded article (detail endpoint, has changes[])
export function volatilityFor(article) {
  if (!article) return 0;
  if (Array.isArray(article.changes)) {
    return article.changes.reduce((s, c) => s + (c.severity || 0), 0);
  }
  // Fallback for list-endpoint shape: change_count × max_severity is a
  // reasonable proxy that preserves the right ordering most of the time.
  return (article.change_count || 0) * (article.max_severity || 0);
}

export function maxSeverity(article) {
  if (!article) return 0;
  if (Array.isArray(article.changes)) {
    return article.changes.reduce((m, c) => Math.max(m, c.severity || 0), 0);
  }
  return article.max_severity || 0;
}

// Volatility for an article using a recent-changes feed instead of full
// detail. Sums severities of changes whose article_id matches.
export function volatilityFromChanges(articleId, recentChanges) {
  if (!recentChanges) return 0;
  let s = 0;
  for (const c of recentChanges) {
    if (c.article?.id === articleId || c.article_id === articleId) {
      s += c.severity || 0;
    }
  }
  return s;
}

// Pick the article with the highest in-window volatility, computed from the
// recent-changes feed when available; otherwise falls back to the
// list-shape proxy.
export function topVolatile(articles, recentChanges) {
  if (!articles || articles.length === 0) return null;
  const score = (a) =>
    recentChanges && recentChanges.length
      ? volatilityFromChanges(a.id, recentChanges)
      : volatilityFor(a);
  return [...articles].sort((a, b) => score(b) - score(a))[0];
}

export function rankByVolatility(articles, recentChanges, limit = 6) {
  if (!articles) return [];
  const score = (a) =>
    recentChanges && recentChanges.length
      ? volatilityFromChanges(a.id, recentChanges)
      : volatilityFor(a);
  return [...articles]
    .map((a) => ({ article: a, score: score(a) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.article);
}

// Outlet ledger: sums severity per outlet from the recent-changes feed.
// Falls back to article.change_count * max_severity proxy when no feed.
export function outletLedger(articles, recentChanges) {
  const tally = new Map();
  if (recentChanges && recentChanges.length) {
    for (const c of recentChanges) {
      const outlet = c.article?.outlet || c.outlet;
      if (!outlet) continue;
      tally.set(outlet, (tally.get(outlet) || 0) + (c.severity || 0));
    }
  } else if (articles) {
    for (const a of articles) {
      const v = volatilityFor(a);
      if (!a.outlet) continue;
      tally.set(a.outlet, (tally.get(a.outlet) || 0) + v);
    }
  }
  const rows = [...tally.entries()].map(([outlet, score]) => ({
    outlet,
    label: OUTLET_LABELS[outlet] || outlet.toUpperCase(),
    score,
  }));
  rows.sort((a, b) => b.score - a.score);
  const max = rows[0]?.score || 1;
  return rows.map((r) => ({ ...r, pct: r.score / max }));
}

// Type breakdown: counts by change_type from the recent-changes feed.
export function typeBreakdown(recentChanges) {
  if (!recentChanges || !recentChanges.length) return [];
  const tally = new Map();
  for (const c of recentChanges) {
    if (!c.change_type) continue;
    tally.set(c.change_type, (tally.get(c.change_type) || 0) + 1);
  }
  return [...tally.entries()]
    .map(([t, count]) => ({
      label: typeLabel(t),
      count,
      color: typeColor(t),
    }))
    .sort((a, b) => b.count - a.count);
}

// Top-of-page stats. Uses articles for "ARTICLES" total; uses recentChanges
// for edits/vibe-shifts so the numbers reflect the selected window.
export function dashboardStats(articles, recentChanges) {
  let versions = 0;
  let edits = 0;
  let vibeShifts = 0;
  if (articles) {
    for (const a of articles) {
      // Detail endpoint exposes versions[]; list endpoint doesn't, so fall
      // back to a heuristic of 1 + change_count.
      if (Array.isArray(a.versions)) {
        versions += a.versions.length;
      } else {
        versions += 1 + (a.change_count || 0);
      }
    }
  }
  if (recentChanges) {
    for (const c of recentChanges) {
      if ((c.severity || 0) >= 3) edits += 1;
      if ((c.severity || 0) >= 4) vibeShifts += 1;
    }
  }
  return { articles: articles?.length || 0, versions, edits, vibeShifts };
}

// Look up the most-recent recent-change row for a given article id, useful
// for showing a preview line on a tape card without fetching detail.
export function topChangeForArticle(articleId, recentChanges) {
  if (!recentChanges) return null;
  let best = null;
  for (const c of recentChanges) {
    if (c.article?.id !== articleId && c.article_id !== articleId) continue;
    if (!best || (c.severity || 0) > (best.severity || 0)) best = c;
  }
  return best;
}

export function latestChangeIsoForArticle(articleId, recentChanges) {
  if (!recentChanges) return null;
  let latest = null;
  for (const c of recentChanges) {
    if (c.article?.id !== articleId && c.article_id !== articleId) continue;
    const iso = c.classified_at;
    if (!iso) continue;
    if (!latest || iso > latest) latest = iso;
  }
  return latest;
}

export function filterChanges(recentChanges, { outlets, changeTypes } = {}) {
  if (!recentChanges) return [];
  const allOutlets = !outlets || outlets.length === 0;
  const allTypes = !changeTypes || changeTypes.length === 0;
  if (allOutlets && allTypes) return recentChanges;
  return recentChanges.filter((c) => {
    if (!allOutlets) {
      const o = c.article?.outlet || c.outlet;
      if (!outlets.includes(o)) return false;
    }
    if (!allTypes && !changeTypes.includes(c.change_type)) return false;
    return true;
  });
}

export function filterArticles(articles, { outlets, changeTypes, recentChanges } = {}) {
  if (!articles) return [];
  const allOutlets = !outlets || outlets.length === 0;
  const allTypes = !changeTypes || changeTypes.length === 0;
  let list = articles;
  if (!allOutlets) list = list.filter((a) => outlets.includes(a.outlet));
  if (!allTypes && recentChanges) {
    const allowedIds = new Set(
      recentChanges
        .filter((c) => changeTypes.includes(c.change_type))
        .map((c) => c.article?.id ?? c.article_id)
        .filter(Boolean)
    );
    list = list.filter((a) => allowedIds.has(a.id));
  }
  return list;
}

// Sort articles by most-recent change activity (from the recent-changes
// feed). Articles with no recent activity fall back to first_seen.
// Returns up to `limit` articles, most recent first.
export function rankByRecency(articles, recentChanges, limit = 12) {
  if (!articles) return [];
  const score = (a) => {
    const iso = latestChangeIsoForArticle(a.id, recentChanges) || a.first_seen;
    return iso ? new Date(iso).getTime() : 0;
  };
  return [...articles].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function formatAge(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} ${hh}:${mm}`;
}

export function formatTimeOfDay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function trackedSinceLabel(article) {
  if (!article) return "—";
  const iso = article.versions?.[0]?.scraped_at || article.first_seen;
  return formatTimestamp(iso).toUpperCase();
}

export function hoursTracked(article) {
  if (!article) return 0;
  const iso = article.versions?.[0]?.scraped_at || article.first_seen;
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
}

export function originalHeadline(article) {
  if (!article) return "";
  return article.versions?.[0]?.headline || article.headline || "";
}

export function currentHeadline(article) {
  if (!article) return "";
  const v = article.versions;
  if (v && v.length) return v[v.length - 1].headline || "";
  return article.headline || "";
}

// Word-level diff (longest common subsequence) for headline old → new.
// Returns an array of segments: { kind: "same" | "del" | "add", text: string }.
export function wordDiff(oldText, newText) {
  const o = (oldText || "").split(/(\s+)/).filter((x) => x.length);
  const n = (newText || "").split(/(\s+)/).filter((x) => x.length);
  const m = o.length;
  const k = n.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(k + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = k - 1; j >= 0; j--) {
      dp[i][j] = o[i] === n[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < m && j < k) {
    if (o[i] === n[j]) {
      out.push({ kind: "same", text: o[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: o[i] });
      i++;
    } else {
      out.push({ kind: "add", text: n[j] });
      j++;
    }
  }
  while (i < m) out.push({ kind: "del", text: o[i++] });
  while (j < k) out.push({ kind: "add", text: n[j++] });
  return out;
}
