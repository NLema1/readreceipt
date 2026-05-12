/* Readreceipt 2.0 — shared lib: tokens, mock data, primitives */

// ---------- TOKENS ----------
const RR = {
  paper:    '#FAF7F0',
  paper2:   '#F2EDDF',
  card:     '#FFFFFF',
  ink:      '#14110D',
  ink2:     '#3B342B',
  soft:     '#6B6157',
  mute:     '#A19888',
  hair:     '#E8DFCB',
  hair2:    '#D9CFB9',
  red:      '#C8311E',
  redDeep:  '#8E1F14',
  amber:    '#B26A00',
  green:    '#2F7A52',
  blue:     '#2A4A6B',
};

const FONT = {
  serif: '"Instrument Serif", "Times New Roman", Georgia, serif',
  sans:  'Inter, "Helvetica Neue", system-ui, sans-serif',
  mono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// ---------- OUTLETS ----------
const OUTLETS = {
  guardian:   { label: 'The Guardian',    short: 'Guardian',    logo: 'logos/guardian.svg' },
  bbc:        { label: 'BBC News',        short: 'BBC',         logo: 'logos/bbc.svg' },
  npr:        { label: 'NPR',             short: 'NPR',         logo: 'logos/npr.svg' },
  aljazeera:  { label: 'Al Jazeera',      short: 'Al Jazeera',  logo: 'logos/aljazeera.svg' },
  propublica: { label: 'ProPublica',      short: 'ProPublica',  logo: 'logos/propublica.svg' },
  nbc:        { label: 'NBC News',        short: 'NBC',         logo: 'logos/nbc.svg' },
  cbs:        { label: 'CBS News',        short: 'CBS',         logo: 'logos/cbs.svg' },
  thehill:    { label: 'The Hill',        short: 'The Hill',    logo: 'logos/thehill.svg' },
  sky:        { label: 'Sky News',        short: 'Sky',         logo: 'logos/sky.svg' },
  fox:        { label: 'Fox News',        short: 'Fox',         logo: 'logos/fox.svg' },
  nypost:     { label: 'New York Post',   short: 'NY Post',     logo: 'logos/nypost.svg' },
};

const CHANGE_TYPES = {
  headline_change:  { label: 'Headline',  short: 'HEADLINE',  hue: RR.red },
  fact_change:      { label: 'Fact',      short: 'FACT',      hue: RR.red },
  quote_change:     { label: 'Quote',     short: 'QUOTE',     hue: RR.amber },
  source_removed:   { label: 'Source',    short: 'SOURCE',    hue: RR.amber },
  addition:         { label: 'Addition',  short: 'ADDITION',  hue: RR.green },
  deletion:         { label: 'Deletion',  short: 'DELETION',  hue: RR.amber },
  temporal_update:  { label: 'Temporal',  short: 'TEMPORAL',  hue: RR.blue },
  routine_update:   { label: 'Routine',   short: 'ROUTINE',   hue: RR.blue },
  other:            { label: 'Other',     short: 'OTHER',     hue: RR.soft },
};

// ---------- MOCK DATA ----------
// Realistic-feeling article + change records for the screens.
const ARTICLES = [
  {
    id: 1042, outlet: 'guardian', sev: 5, changes: 11, vol: 38, hours: 14,
    headline: 'Norwegian government attacked over decision to reopen North Sea gasfields',
    headlineOrig: 'Norwegian government rebuked over decision to reopen North Sea gasfields',
    topType: 'headline_change',
    summary: 'Headline tone intensified from "rebuked" to "attacked"; minor copy edits in body.',
    age: '12m ago',
  },
  {
    id: 1031, outlet: 'bbc', sev: 4, changes: 7, vol: 24, hours: 6,
    headline: 'Officials revise casualty figure upward after overnight strikes',
    headlineOrig: 'Officials confirm casualty figure after overnight strikes',
    topType: 'fact_change',
    summary: 'Casualty count revised from "at least 12" to "at least 17".',
    age: '34m ago',
  },
  {
    id: 1019, outlet: 'npr', sev: 4, changes: 5, vol: 16, hours: 22,
    headline: 'Senate moves to restrict hedge funds as bipartisan deal solidifies',
    headlineOrig: 'Senate weighs new restrictions on hedge funds',
    topType: 'headline_change',
    summary: 'Headline reframed from deliberation ("weighs") to action ("moves to").',
    age: '1h ago',
  },
  {
    id: 1057, outlet: 'aljazeera', sev: 3, changes: 9, vol: 22, hours: 30,
    headline: 'Aid convoy enters southern corridor after weeks of delay',
    headlineOrig: 'Aid convoy expected to enter southern corridor',
    topType: 'temporal_update',
    summary: 'Tense updated from "expected to" to "enters" as convoy crossed.',
    age: '2h ago',
  },
  {
    id: 1063, outlet: 'propublica', sev: 5, changes: 4, vol: 14, hours: 48,
    headline: 'Agency emails reveal earlier knowledge of contamination',
    headlineOrig: 'Agency emails suggest possible knowledge of contamination',
    topType: 'fact_change',
    summary: 'Hedge "suggest possible" replaced with "reveal" — claim hardened.',
    age: '3h ago',
  },
  {
    id: 1068, outlet: 'nbc', sev: 3, changes: 6, vol: 14, hours: 10,
    headline: 'Storm system intensifies as it tracks toward the Outer Banks',
    headlineOrig: 'Storm system approaches the Outer Banks',
    topType: 'addition',
    summary: 'Added paragraph on revised wind speeds and evacuation guidance.',
    age: '4h ago',
  },
  {
    id: 1077, outlet: 'cbs', sev: 2, changes: 3, vol: 6, hours: 8,
    headline: 'Mayor responds to commission findings on transit overruns',
    headlineOrig: 'Mayor responds to commission findings on transit overruns',
    topType: 'quote_change',
    summary: 'One quote softened from "scandalous" to "deeply concerning".',
    age: '5h ago',
  },
  {
    id: 1081, outlet: 'thehill', sev: 4, changes: 8, vol: 22, hours: 36,
    headline: 'Whip count narrows as committee chair shifts position',
    headlineOrig: 'Whip count holds as committee debates next steps',
    topType: 'fact_change',
    summary: 'Vote count revised; chair\'s position recharacterized.',
    age: '6h ago',
  },
  {
    id: 1093, outlet: 'sky', sev: 3, changes: 5, vol: 12, hours: 20,
    headline: 'Energy regulator tightens rules on offshore drilling permits',
    headlineOrig: 'Energy regulator considers tightening offshore drilling rules',
    topType: 'temporal_update',
    summary: 'Action reframed from "considers" to "tightens" after vote.',
    age: '8h ago',
  },
  {
    id: 1099, outlet: 'fox', sev: 2, changes: 4, vol: 8, hours: 12,
    headline: 'School board postpones vote on revised curriculum',
    headlineOrig: 'School board to vote on revised curriculum tonight',
    topType: 'temporal_update',
    summary: 'Schedule update; meeting deferred to next week.',
    age: '11h ago',
  },
  {
    id: 1104, outlet: 'nypost', sev: 3, changes: 7, vol: 16, hours: 5,
    headline: 'Subway shutdown extended into morning rush, MTA says',
    headlineOrig: 'Subway shutdown contained, MTA says',
    topType: 'fact_change',
    summary: 'Status reversed from contained to extended.',
    age: '13h ago',
  },
  {
    id: 1112, outlet: 'guardian', sev: 4, changes: 6, vol: 18, hours: 9,
    headline: 'Treasury removes attribution from controversial briefing claim',
    headlineOrig: 'Treasury attributes briefing claim to two senior officials',
    topType: 'source_removed',
    summary: 'Two-officials attribution removed; claim now unsourced.',
    age: '14h ago',
  },
];

// Versions + changes for the spotlight article (id 1042)
const SPOTLIGHT = {
  id: 1042, outlet: 'guardian', firstSeen: '2026-05-08T07:14:00Z',
  url: 'https://www.theguardian.com/environment/2026/may/08/norwegian-government-north-sea',
  versions: [
    { v: 1, time: '07:14', label: 'V1 · Original', headline: 'Norwegian government rebuked over decision to reopen North Sea gasfields' },
    { v: 2, time: '08:02', label: 'V2 · Copy edit', headline: 'Norwegian government rebuked over decision to reopen North Sea gas fields' },
    { v: 3, time: '09:31', label: 'V3 · Source added', headline: 'Norwegian government rebuked over decision to reopen North Sea gasfields' },
    { v: 4, time: '11:08', label: 'V4 · Reframe', headline: 'Norwegian government attacked over decision to reopen North Sea gasfields' },
    { v: 5, time: '12:44', label: 'V5 · Body expanded', headline: 'Norwegian government attacked over decision to reopen North Sea gasfields' },
    { v: 6, time: '14:20', label: 'V6 · Quote revised', headline: 'Norwegian government attacked over decision to reopen North Sea gasfields' },
  ],
  changes: [
    { at: '14:20', sev: 4, type: 'quote_change',    summary: 'Direct quote from energy minister revised; tone sharpened.' },
    { at: '12:44', sev: 3, type: 'addition',        summary: 'Added two paragraphs of opposition response and analyst commentary.' },
    { at: '11:08', sev: 4, type: 'headline_change', summary: 'Headline tone intensified from "rebuked" to "attacked".' },
    { at: '11:08', sev: 3, type: 'fact_change',     summary: 'Insertion: "the current disruption" — softens prior absolute framing.' },
    { at: '09:31', sev: 3, type: 'addition',        summary: 'Added attribution to Norwegian Petroleum Directorate.' },
    { at: '09:31', sev: 2, type: 'addition',        summary: 'Added two-sentence background on previous license grants.' },
    { at: '08:02', sev: 1, type: 'other',           summary: 'Compound-word standardization: "gas fields" → "gasfields".' },
    { at: '08:02', sev: 1, type: 'other',           summary: 'Punctuation cleanup in lede.' },
    { at: '07:48', sev: 2, type: 'temporal_update', summary: 'Tense update: "will rule" → "ruled" after court decision posted.' },
    { at: '07:32', sev: 1, type: 'other',           summary: 'Typo fix: "goverment" → "government".' },
    { at: '07:22', sev: 2, type: 'routine_update',  summary: 'Routine update with statement from Minister of Energy.' },
  ],
};

// ---------- PRIMITIVES ----------
const Hair = ({ style, dashed }) => (
  <div style={{ height: 1, background: dashed ? `repeating-linear-gradient(90deg,${RR.hair2} 0 4px,transparent 4px 8px)` : RR.hair, ...style }} />
);

const Kicker = ({ children, style }) => (
  <div style={{
    fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: RR.soft, ...style
  }}>{children}</div>
);

const Mono = ({ children, style }) => (
  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: RR.ink, ...style }}>{children}</span>
);

const SerifI = ({ children, style }) => (
  <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', color: RR.ink, ...style }}>{children}</span>
);

const OutletMark = ({ outlet, height = 14, mono = false, withName = true }) => {
  const o = OUTLETS[outlet]; if (!o) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img src={o.logo} alt={o.label} style={{
        height, width: 'auto', maxWidth: 80, objectFit: 'contain',
        filter: 'grayscale(1) contrast(1.05)'
      }}/>
      {withName && (
        <span style={{
          fontFamily: mono ? FONT.mono : FONT.sans,
          fontSize: 11, letterSpacing: mono ? '0.12em' : '0.02em',
          textTransform: mono ? 'uppercase' : 'none',
          color: RR.ink, fontWeight: 500
        }}>{o.short}</span>
      )}
    </span>
  );
};

const SevDot = ({ s, size = 10 }) => {
  const c = s >= 5 ? RR.redDeep : s >= 4 ? RR.red : s >= 3 ? RR.amber : RR.mute;
  return <span style={{
    display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: c, verticalAlign: 'middle'
  }}/>;
};

const SevPill = ({ s }) => {
  const c = s >= 5 ? RR.redDeep : s >= 4 ? RR.red : s >= 3 ? RR.amber : RR.soft;
  return (
    <span style={{
      fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', fontWeight: 600,
      color: c, border: `1px solid ${c}`, padding: '2px 6px', borderRadius: 2,
      background: 'transparent', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>S·{s}</span>
  );
};

const TypeTag = ({ type }) => {
  const t = CHANGE_TYPES[type] || CHANGE_TYPES.other;
  return (
    <span style={{
      fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
      color: t.hue, textTransform: 'uppercase'
    }}>{t.short}</span>
  );
};

const Diff = ({ oldText, newText }) => (
  <div style={{ fontFamily: FONT.serif, fontSize: 18, lineHeight: 1.3 }}>
    <div style={{ color: RR.soft, textDecoration: 'line-through', textDecorationColor: RR.red, textDecorationThickness: 1.5 }}>
      {oldText}
    </div>
    <div style={{ color: RR.ink, marginTop: 4, borderBottom: `2px solid ${RR.green}`, display: 'inline-block', paddingBottom: 1 }}>
      {newText}
    </div>
  </div>
);

const Sparkline = ({ data, width = 120, height = 28, color = RR.ink, fill }) => {
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((d, i) => `${i * step},${height - (d / max) * height}`).join(' ');
  const area = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <polygon points={area} fill={fill} opacity="0.18"/>}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
};

// Severity-time series for stats / hero ticker (24 hourly buckets)
const SEV_24H = [3,4,2,2,1,1,2,3,5,7,8,9,11,14,12,10,9,8,11,13,15,12,9,6];
const SEV_7D  = [42,55,61,48,72,89,103];

// Quick lookup helpers
const outletOf = (k) => OUTLETS[k] || OUTLETS.other;
const typeOf   = (k) => CHANGE_TYPES[k] || CHANGE_TYPES.other;

Object.assign(window, {
  RR, FONT, OUTLETS, CHANGE_TYPES, ARTICLES, SPOTLIGHT, SEV_24H, SEV_7D,
  Hair, Kicker, Mono, SerifI, OutletMark, SevDot, SevPill, TypeTag, Diff, Sparkline,
  outletOf, typeOf,
});
