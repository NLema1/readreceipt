// Severity scale used by the classifier (1 cosmetic … 4 critical/reversal).
// Kept loose — the API allows arbitrary ints, this is just the named map
// for filter UIs and human-readable thresholds.
export const SEVERITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

// Time-window picker keys for filter strips.
export const WINDOW_KEYS = ["24h", "7d", "30d", "all"];

export const WINDOW_LABELS = {
  "24h": "Last 24 hours",
  "7d":  "Last 7 days",
  "30d": "Last 30 days",
  "all": "All time",
};

// Search-input debounce (ms). The inline search bar is slower than the
// cmd-K palette because users typically dwell on the inline page,
// whereas palette users tab through results quickly.
export const DEBOUNCE_MS = {
  SEARCH: 220,
  COMMAND_PALETTE: 180,
};

// Receipt-style article id prefix shown to users ("RR-1234").
export const ARTICLE_ID_PREFIX = "RR-";
