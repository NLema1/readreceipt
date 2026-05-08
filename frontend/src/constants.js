export const CHANGE_TYPE_COLORS = {
  headline_change: "#3b82f6",
  fact_change: "#ef4444",
  quote_change: "#a855f7",
  source_removed: "#f97316",
  addition: "#14b8a6",
  deletion: "#ec4899",
  temporal_update: "#06b6d4",
  routine_update: "#84cc16",
  other: "#737373",
};

export const CHANGE_TYPE_LABELS = {
  headline_change: "Headline change",
  fact_change: "Fact change",
  quote_change: "Quote change",
  source_removed: "Source removed",
  addition: "Addition",
  deletion: "Deletion",
  temporal_update: "Temporal update",
  routine_update: "Routine update",
  other: "Other",
};

export const SEVERITY_SIZES = {
  0: 6,
  1: 6,
  2: 9,
  3: 12,
  4: 16,
  5: 20,
};

// Score Badge palette — used by the left-pane scoreboard and right-pane line items.
// Tailwind-aligned so consumers can use either Tailwind classes or raw hex.
export const SEVERITY_BADGE_COLORS = {
  0: { bg: "#1f1f1f", text: "#737373", label: "—" },
  1: { bg: "#262626", text: "#a3a3a3", label: "S1" },
  2: { bg: "#262626", text: "#a3a3a3", label: "S2" },
  3: { bg: "#3f2f0a", text: "#fbbf24", label: "S3" },
  4: { bg: "#3a1d05", text: "#fb923c", label: "S4" },
  5: { bg: "#3f0a0a", text: "#f87171", label: "S5" },
};

// Short uppercase labels for the receipt line items.
export const CHANGE_TYPE_SHORT_LABELS = {
  headline_change: "HEADLINE",
  fact_change: "FACT",
  quote_change: "QUOTE",
  source_removed: "SOURCE",
  addition: "ADDITION",
  deletion: "DELETION",
  temporal_update: "TEMPORAL",
  routine_update: "ROUTINE",
  other: "OTHER",
};

export const ALL_CHANGE_TYPES = [
  "headline_change",
  "fact_change",
  "quote_change",
  "source_removed",
  "addition",
  "deletion",
  "temporal_update",
  "routine_update",
  "other",
];

export const ALL_OUTLETS = [
  "guardian", "bbc", "npr", "aljazeera", "propublica",
  "nbc", "cbs", "thehill", "sky", "fox", "nypost",
];

export const OUTLET_LABELS = {
  guardian: "Guardian",
  bbc: "BBC",
  npr: "NPR",
  aljazeera: "Al Jazeera",
  propublica: "ProPublica",
  nbc: "NBC News",
  cbs: "CBS News",
  thehill: "The Hill",
  sky: "Sky News",
  fox: "Fox News",
  nypost: "New York Post",
};
