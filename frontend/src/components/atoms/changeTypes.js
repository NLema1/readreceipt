import { RR } from "./tokens";

export const CHANGE_TYPES = {
  headline_change:    { label: 'Headline',    short: 'HEADLINE',    hue: RR.red },
  fact_change:        { label: 'Fact',        short: 'FACT',        hue: RR.red },
  correction:         { label: 'Correction',  short: 'CORRECTION',  hue: RR.red },
  quote_change:       { label: 'Quote',       short: 'QUOTE',       hue: RR.amber },
  attribution_update: { label: 'Attribution', short: 'ATTRIBUTION', hue: RR.amber },
  source_removed:     { label: 'Source',      short: 'SOURCE',      hue: RR.amber },
  addition:           { label: 'Addition',    short: 'ADDITION',    hue: RR.green },
  deletion:           { label: 'Deletion',    short: 'DELETION',    hue: RR.amber },
  temporal_update:    { label: 'Temporal',    short: 'TEMPORAL',    hue: RR.blue },
  routine_update:     { label: 'Routine',     short: 'ROUTINE',     hue: RR.blue },
  copy_edit:          { label: 'Copy edit',   short: 'COPY',        hue: RR.soft },
  other:              { label: 'Other',       short: 'OTHER',       hue: RR.soft },
};

export const CHANGE_TYPE_KEYS = Object.keys(CHANGE_TYPES);

export const typeOf = (k) => CHANGE_TYPES[k] || CHANGE_TYPES.other;
