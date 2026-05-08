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

export function volatilityFor(article) {
  if (!article || !article.changes) return 0;
  return article.changes.reduce((s, c) => s + (c.severity || 0), 0);
}

export function maxSeverity(article) {
  if (!article || !article.changes) return 0;
  return article.changes.reduce((m, c) => Math.max(m, c.severity || 0), 0);
}

export function topVolatile(articles) {
  if (!articles || articles.length === 0) return null;
  return [...articles].sort((a, b) => volatilityFor(b) - volatilityFor(a))[0];
}

export function outletLedger(articles) {
  if (!articles) return [];
  const tally = new Map();
  for (const a of articles) {
    const v = volatilityFor(a);
    tally.set(a.outlet, (tally.get(a.outlet) || 0) + v);
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

export function typeBreakdown(articles) {
  if (!articles) return [];
  const tally = new Map();
  for (const a of articles) {
    for (const c of a.changes || []) {
      tally.set(c.change_type, (tally.get(c.change_type) || 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([t, count]) => ({
      label: typeLabel(t),
      count,
      color: typeColor(t),
    }))
    .sort((a, b) => b.count - a.count);
}

export function dashboardStats(articles) {
  if (!articles) return { articles: 0, versions: 0, edits: 0, vibeShifts: 0 };
  let versions = 0;
  let edits = 0;
  let vibeShifts = 0;
  for (const a of articles) {
    versions += a.versions?.length || 0;
    for (const c of a.changes || []) {
      if (c.severity >= 3) edits += 1;
      if (c.severity >= 4) vibeShifts += 1;
    }
  }
  return { articles: articles.length, versions, edits, vibeShifts };
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
