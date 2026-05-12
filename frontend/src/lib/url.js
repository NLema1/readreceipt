export function looksLikeUrl(s) {
  const t = s.trim();
  if (!t) return false;
  return /^https?:\/\//i.test(t) || /^www\./i.test(t);
}

export function normalizeUrl(s) {
  const t = s.trim();
  if (/^www\./i.test(t)) return `https://${t}`;
  return t;
}
