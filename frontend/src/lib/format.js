// Small, page-agnostic helpers.

export function ageLabel(iso) {
  if (!iso) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function timeOfDay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function hostFromUrl(u) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return url.host.replace(/^www\./, "") + url.pathname;
  } catch {
    return u;
  }
}

// Word-level diff via LCS DP. Returns an array of { kind: 'same'|'add'|'del', token }.
export function wordDiff(oldText, newText) {
  const a = (oldText || "").split(/(\s+)/).filter(Boolean);
  const b = (newText || "").split(/(\s+)/).filter(Boolean);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ kind: "same", token: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: "del", token: a[i] }); i++; }
    else { out.push({ kind: "add", token: b[j] }); j++; }
  }
  while (i < m) { out.push({ kind: "del", token: a[i] }); i++; }
  while (j < n) { out.push({ kind: "add", token: b[j] }); j++; }
  return out;
}
