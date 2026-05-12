export function topChange(changes) {
  if (!changes || changes.length === 0) return null;
  let best = changes[0];
  for (const c of changes) if ((c.severity || 0) > (best.severity || 0)) best = c;
  return best;
}

export function volatility(changes) {
  if (!changes) return 0;
  return changes.reduce((s, c) => s + (c.severity || 0), 0);
}

export function hoursTracked(firstSeenIso) {
  if (!firstSeenIso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(firstSeenIso).getTime()) / 3_600_000));
}

// Deterministic pseudo-random sparkline. Seeded by article id so re-renders
// don't flicker. Used when the server doesn't expose a granular timeline.
export function sparkData(id, changeCount) {
  const seed = id || 1;
  const base = Math.max(2, Math.min(changeCount || 2, 14));
  return Array.from({ length: 8 }, (_, i) =>
    ((seed * 7 + i * i * 3) % 14) + 1 + (i === 7 ? base / 2 : 0)
  );
}
