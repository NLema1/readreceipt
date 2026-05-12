/* Readreceipt 2.0 — Mobile screens (375 wide). Reuses tokens from lib.jsx. */

const W = 402;
const STATUS_PAD = 52; // clear iOS status bar / dynamic island
const TAB_PAD = 78 + 34; // bottom tabbar + home indicator

// ---------- shared mobile chrome ----------
const MTopbar = ({ title, sub, right }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '14px 18px 12px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper,
  }}>
    <div>
      <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.18em', color: RR.soft, textTransform: 'uppercase' }}>
        Readreceipt
      </div>
      <div style={{ fontFamily: FONT.serif, fontSize: 24, lineHeight: 1, color: RR.ink, marginTop: 2 }}>
        {title}
      </div>
      {sub && <div style={{ fontFamily: FONT.sans, fontSize: 11, color: RR.soft, marginTop: 4 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const MTabbar = ({ active }) => {
  const items = [
    { k: 'home',   label: 'Home',   d: 'M3 11 12 3l9 8v10h-6v-6h-6v6H3z' },
    { k: 'feed',   label: 'Feed',   d: 'M4 5h16M4 12h16M4 19h10' },
    { k: 'search', label: 'Search', d: 'M11 19a8 8 0 1 1 5.3-14 8 8 0 0 1-5.3 14zM21 21l-4.3-4.3' },
    { k: 'stats',  label: 'Stats',  d: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 34, left: 0, right: 0, height: 78,
      borderTop: `1px solid ${RR.hair}`, background: RR.paper,
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', paddingBottom: 6,
    }}>
      {items.map(it => (
        <div key={it.k} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          color: it.k === active ? RR.ink : RR.mute,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d={it.d}/>
          </svg>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const MScreen = ({ children, scroll = true }) => (
  <div style={{
    width: '100%', height: '100%', background: RR.paper, color: RR.ink,
    fontFamily: FONT.sans, position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      paddingTop: STATUS_PAD, paddingBottom: TAB_PAD,
      overflowY: scroll ? 'auto' : 'hidden',
    }}>
      {children}
    </div>
  </div>
);

// ====================================================================
// 1) LANDING
// ====================================================================
const MLanding = () => (
  <MScreen>
    {/* status-style brand row */}
    <div style={{
      padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.16em', color: RR.soft, textTransform: 'uppercase',
    }}>
      <span>Readreceipt</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: RR.red }}/>
        Live · 47 today
      </span>
    </div>

    {/* HERO */}
    <div style={{ padding: '22px 18px 24px' }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.22em', color: RR.soft, textTransform: 'uppercase' }}>
        Quiet edits, on the record
      </div>
      <h1 style={{
        margin: '10px 0 0', fontFamily: FONT.serif, fontWeight: 400, fontSize: 46, lineHeight: 0.98, color: RR.ink,
        letterSpacing: '-0.01em',
      }}>
        Every change<br/>
        <span style={{ fontStyle: 'italic', color: RR.redDeep }}>they didn't</span><br/>
        announce.
      </h1>
      <p style={{
        marginTop: 16, fontFamily: FONT.serif, fontSize: 18, lineHeight: 1.35, color: RR.ink2,
      }}>
        We watch eleven major outlets and post a receipt every time they
        rewrite a headline, soften a quote, or quietly drop a source.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button style={{
          flex: 1, padding: '13px 0', border: 'none', background: RR.ink, color: RR.paper,
          fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          borderRadius: 2,
        }}>See today's edits →</button>
        <button style={{
          padding: '13px 14px', border: `1px solid ${RR.ink}`, background: 'transparent', color: RR.ink,
          fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          borderRadius: 2,
        }}>How</button>
      </div>
    </div>

    {/* live ticker strip */}
    <div style={{ borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
      <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Kicker>Last 24 hours</Kicker>
        <Mono style={{ color: RR.soft }}>{SEV_24H.reduce((a,b)=>a+b,0)} edits</Mono>
      </div>
      <div style={{ padding: '0 18px 12px' }}>
        <Sparkline data={SEV_24H} width={W - 36} height={42} color={RR.red} fill={RR.red}/>
      </div>
    </div>

    {/* SAMPLE RECEIPT */}
    <div style={{ padding: '24px 18px 8px' }}>
      <Kicker style={{ marginBottom: 10 }}>Sample receipt</Kicker>
      <div style={{
        background: RR.card, border: `1px solid ${RR.hair2}`,
        borderRadius: 2, padding: '18px 18px 16px',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 12px 24px -16px rgba(20,17,13,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <OutletMark outlet="guardian" height={14}/>
          <SevPill s={5}/>
        </div>
        <Hair style={{ margin: '10px 0' }} dashed/>
        <Diff
          oldText="Norwegian government rebuked over decision to reopen North Sea gasfields"
          newText="Norwegian government attacked over decision to reopen North Sea gasfields"
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, fontFamily: FONT.mono, fontSize: 10, color: RR.soft, letterSpacing: '0.08em' }}>
          <span>11:08</span><span>·</span><TypeTag type="headline_change"/><span>·</span><span>V4</span>
        </div>
      </div>
    </div>

    {/* OUTLETS */}
    <div style={{ padding: '24px 18px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Kicker>Watching · 11 outlets</Kicker>
        <Mono style={{ color: RR.soft }}>47 today</Mono>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
        background: RR.hair, marginTop: 12, border: `1px solid ${RR.hair}`,
      }}>
        {Object.keys(OUTLETS).slice(0,9).map(k => (
          <div key={k} style={{
            background: RR.paper, padding: '18px 8px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', height: 64,
          }}>
            <img src={OUTLETS[k].logo} alt={OUTLETS[k].label}
              style={{ maxHeight: 22, maxWidth: '90%', objectFit: 'contain', filter: 'grayscale(1)' }}/>
          </div>
        ))}
      </div>
    </div>

    {/* HOW IT WORKS */}
    <div style={{ padding: '28px 18px 32px' }}>
      <Kicker>How it works</Kicker>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          { n: '01', t: 'We pull RSS', d: 'Eleven feeds, every 90 seconds.' },
          { n: '02', t: 'We diff', d: 'Headlines, body, sources, quotes.' },
          { n: '03', t: 'We classify', d: 'Severity 1–5; nine edit types.' },
          { n: '04', t: 'You read', d: 'Receipts on the record, forever.' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 14 }}>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 32, color: RR.redDeep, lineHeight: 1, width: 36 }}>
              {s.n}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 19, color: RR.ink }}>{s.t}</div>
              <div style={{ fontFamily: FONT.sans, fontSize: 13, color: RR.soft, marginTop: 2 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <MTabbar active="home"/>
  </MScreen>
);

// ====================================================================
// 2) FEED
// ====================================================================
const MFeed = () => {
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { k: 'all', l: 'All' },
    { k: 'sev', l: 'Severe' },
    { k: 'head', l: 'Headlines' },
    { k: 'fact', l: 'Facts' },
  ];
  const items = ARTICLES.filter(a =>
    filter === 'all' ? true :
    filter === 'sev'  ? a.sev >= 4 :
    filter === 'head' ? a.topType === 'headline_change' :
    filter === 'fact' ? a.topType === 'fact_change' : true
  );

  return (
    <MScreen>
      <MTopbar
        title="Today"
        sub="47 edits across 11 outlets · updated 12s ago"
        right={
          <button style={{
            border: `1px solid ${RR.hair2}`, background: 'transparent', borderRadius: 2,
            padding: '8px 10px', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', color: RR.ink, textTransform: 'uppercase',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
            Search
          </button>
        }
      />

      {/* filter chips */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 18px', overflowX: 'auto',
        borderBottom: `1px solid ${RR.hair}`, background: RR.paper,
      }}>
        {filters.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            border: `1px solid ${filter === f.k ? RR.ink : RR.hair2}`,
            background: filter === f.k ? RR.ink : 'transparent',
            color: filter === f.k ? RR.paper : RR.ink,
            fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '7px 11px', borderRadius: 2, whiteSpace: 'nowrap',
          }}>{f.l}</button>
        ))}
      </div>

      {/* list */}
      <div>
        {items.map(a => (
          <article key={a.id} style={{
            padding: '16px 18px 18px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <OutletMark outlet={a.outlet} height={12}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mono style={{ color: RR.soft, fontSize: 10 }}>{a.age}</Mono>
                <SevPill s={a.sev}/>
              </div>
            </div>
            <h3 style={{
              margin: 0, fontFamily: FONT.serif, fontWeight: 400, fontSize: 19, lineHeight: 1.22, color: RR.ink,
            }}>{a.headline}</h3>
            <div style={{
              fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: RR.soft,
              marginTop: 6, textDecoration: 'line-through', textDecorationColor: RR.hair2,
            }}>
              was: {a.headlineOrig}
            </div>
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', color: RR.soft,
            }}>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <TypeTag type={a.topType}/>
                <span>·</span>
                <span>{a.changes} EDITS</span>
              </span>
              <Sparkline
                data={Array.from({length: 8}, (_, i) => ((a.id*7 + i*i*3) % 14) + 2)}
                width={70} height={18} color={RR.ink}
              />
            </div>
          </article>
        ))}
      </div>

      <MTabbar active="feed"/>
    </MScreen>
  );
};

// ====================================================================
// 3) DETAIL — article timeline
// ====================================================================
const MDetail = () => {
  const sp = SPOTLIGHT;
  return (
    <MScreen>
      {/* header */}
      <div style={{ padding: '14px 18px 18px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button style={{
            border: 'none', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.12em', color: RR.ink, textTransform: 'uppercase',
            padding: 0,
          }}>
            <span style={{ fontSize: 16 }}>←</span> Back
          </button>
          <Mono style={{ color: RR.soft }}>#{sp.id}</Mono>
        </div>
        <OutletMark outlet={sp.outlet} height={14}/>
        <h1 style={{
          margin: '12px 0 8px', fontFamily: FONT.serif, fontWeight: 400, fontSize: 26, lineHeight: 1.12, color: RR.ink,
        }}>
          {sp.versions[sp.versions.length - 1].headline}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SevPill s={5}/>
          <Mono style={{ color: RR.soft }}>{sp.changes.length} edits · {sp.versions.length} versions</Mono>
        </div>
      </div>

      {/* sparkline summary */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Kicker>Edit cadence · 14h</Kicker>
          <Mono style={{ color: RR.soft }}>volatility 38</Mono>
        </div>
        <Sparkline data={[1,1,2,3,2,4,5,3,4,3,2,3,4,5]} width={W - 36} height={36} color={RR.red} fill={RR.red}/>
      </div>

      {/* version diff card */}
      <div style={{ padding: '20px 18px 10px' }}>
        <Kicker style={{ marginBottom: 8 }}>Latest headline change · 11:08</Kicker>
        <div style={{
          background: RR.card, border: `1px solid ${RR.hair2}`, borderRadius: 2,
          padding: '16px 16px 14px',
        }}>
          <Diff
            oldText={sp.versions[2].headline}
            newText={sp.versions[3].headline}
          />
          <Hair style={{ margin: '12px 0' }} dashed/>
          <div style={{ fontFamily: FONT.serif, fontSize: 14, lineHeight: 1.4, color: RR.ink2 }}>
            Tone intensified: <SerifI>"rebuked"</SerifI> → <SerifI>"attacked"</SerifI>. The verb shift reframes the story from institutional pushback to direct confrontation.
          </div>
        </div>
      </div>

      {/* timeline */}
      <div style={{ padding: '20px 18px 24px' }}>
        <Kicker style={{ marginBottom: 14 }}>Full timeline · 11 changes</Kicker>
        <div style={{ position: 'relative' }}>
          {/* spine */}
          <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 1, background: RR.hair2 }}/>
          {sp.changes.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18, position: 'relative' }}>
              <div style={{
                width: 15, height: 15, borderRadius: '50%', marginTop: 4,
                background: RR.paper, border: `1.5px solid ${typeOf(c.type).hue}`,
                position: 'relative', zIndex: 1, flexShrink: 0,
              }}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Mono style={{ color: RR.ink, fontWeight: 600 }}>{c.at}</Mono>
                  <TypeTag type={c.type}/>
                  <SevDot s={c.sev}/>
                </div>
                <div style={{ fontFamily: FONT.serif, fontSize: 15, lineHeight: 1.35, color: RR.ink }}>
                  {c.summary}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MTabbar active="feed"/>
    </MScreen>
  );
};

// ====================================================================
// 4) SEARCH
// ====================================================================
const MSearch = () => {
  const [q, setQ] = React.useState('North Sea');
  const [outlet, setOutlet] = React.useState('all');
  const [sev, setSev] = React.useState('all');
  const [type, setType] = React.useState('all');

  const results = ARTICLES.filter(a =>
    (q === '' || a.headline.toLowerCase().includes(q.toLowerCase()) || a.headlineOrig.toLowerCase().includes(q.toLowerCase())) &&
    (outlet === 'all' || a.outlet === outlet) &&
    (sev === 'all' || (sev === 'sev45' ? a.sev >= 4 : sev === 'sev3' ? a.sev === 3 : a.sev <= 2)) &&
    (type === 'all' || a.topType === type)
  );

  return (
    <MScreen>
      {/* search field */}
      <div style={{ padding: '14px 18px 12px', background: RR.paper }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1px solid ${RR.ink}`, borderRadius: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RR.ink} strokeWidth="1.8">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search headlines, paste a URL…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: FONT.serif, fontSize: 18, color: RR.ink,
            }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              border: 'none', background: 'transparent', color: RR.soft, fontSize: 16, padding: 0,
            }}>×</button>
          )}
        </div>
        <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 10, color: RR.soft, letterSpacing: '0.1em' }}>
          ⌘ + K from any screen
        </div>
      </div>

      {/* filter rows */}
      <div style={{ borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <FilterRow label="Outlet" value={outlet} onChange={setOutlet} options={[
          { k: 'all', l: 'All' },
          ...Object.keys(OUTLETS).slice(0,5).map(k => ({ k, l: OUTLETS[k].short })),
        ]}/>
        <FilterRow label="Severity" value={sev} onChange={setSev} options={[
          { k: 'all',   l: 'All' },
          { k: 'sev45', l: '4–5 Major' },
          { k: 'sev3',  l: '3 Notable' },
          { k: 'sev12', l: '1–2 Minor' },
        ]}/>
        <FilterRow label="Type" value={type} onChange={setType} options={[
          { k: 'all', l: 'All' },
          { k: 'headline_change', l: 'Headline' },
          { k: 'fact_change',     l: 'Fact' },
          { k: 'quote_change',    l: 'Quote' },
          { k: 'source_removed',  l: 'Source' },
          { k: 'temporal_update', l: 'Temporal' },
        ]} last/>
      </div>

      {/* date window */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Kicker>Window</Kicker>
        <div style={{ display: 'flex', gap: 4 }}>
          {['24h','7d','30d','All'].map((w, i) => (
            <button key={w} style={{
              fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '6px 9px', borderRadius: 2,
              border: `1px solid ${i === 1 ? RR.ink : RR.hair2}`,
              background: i === 1 ? RR.ink : 'transparent', color: i === 1 ? RR.paper : RR.ink,
            }}>{w}</button>
          ))}
        </div>
      </div>

      {/* results count */}
      <div style={{ padding: '4px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 16, color: RR.ink }}>
          <SerifI style={{ color: RR.redDeep }}>{results.length}</SerifI> results
        </div>
        <Mono style={{ color: RR.soft }}>SORT · NEWEST</Mono>
      </div>

      {/* result rows */}
      <div>
        {results.map(a => (
          <div key={a.id} style={{
            padding: '12px 18px', borderTop: `1px solid ${RR.hair}`,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <OutletMark outlet={a.outlet} height={11}/>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TypeTag type={a.topType}/>
                <SevPill s={a.sev}/>
              </div>
            </div>
            <div style={{ fontFamily: FONT.serif, fontSize: 16, lineHeight: 1.25, color: RR.ink }}>
              {hl(a.headline, q)}
            </div>
            <Mono style={{ color: RR.soft, fontSize: 10 }}>{a.changes} edits · {a.age}</Mono>
          </div>
        ))}
        {results.length === 0 && (
          <div style={{ padding: '40px 18px', textAlign: 'center', color: RR.soft, fontFamily: FONT.serif, fontSize: 16 }}>
            No matches.
          </div>
        )}
      </div>

      <MTabbar active="search"/>
    </MScreen>
  );
};

const FilterRow = ({ label, value, onChange, options, last }) => (
  <div style={{
    padding: '10px 18px', borderBottom: last ? 'none' : `1px solid ${RR.hair}`,
    display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <div style={{
      width: 64, fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: RR.soft,
    }}>{label}</div>
    <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1 }}>
      {options.map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          flexShrink: 0,
          border: `1px solid ${value === o.k ? RR.ink : RR.hair2}`,
          background: value === o.k ? RR.ink : 'transparent',
          color: value === o.k ? RR.paper : RR.ink,
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '5px 9px', borderRadius: 2,
        }}>{o.l}</button>
      ))}
    </div>
  </div>
);

const hl = (text, q) => {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (<>
    {text.slice(0, i)}
    <span style={{ background: 'rgba(200,49,30,0.15)', color: RR.redDeep, padding: '0 2px' }}>{text.slice(i, i+q.length)}</span>
    {text.slice(i+q.length)}
  </>);
};

// ====================================================================
// 5) STATS
// ====================================================================
const MStats = () => {
  const outletStats = [
    { k: 'guardian',   avg: 6.2, count: 14 },
    { k: 'bbc',        avg: 4.8, count: 21 },
    { k: 'thehill',    avg: 5.4, count: 9  },
    { k: 'aljazeera',  avg: 4.1, count: 11 },
    { k: 'npr',        avg: 3.9, count: 7  },
    { k: 'propublica', avg: 3.2, count: 4  },
    { k: 'nbc',        avg: 3.1, count: 8  },
    { k: 'cbs',        avg: 2.4, count: 5  },
  ];
  const maxAvg = Math.max(...outletStats.map(o => o.avg));
  const HOURLY = [3,2,1,0,0,1,2,4,8,11,14,12,10,9,11,13,15,12,9,7,6,5,4,3];
  const maxH = Math.max(...HOURLY);

  return (
    <MScreen>
      <MTopbar title="Stats" sub="May 8, 2026 · 47 edits today"/>

      {/* tabs */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 18px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper,
      }}>
        {['Outlets', 'Volatility', 'Cadence'].map((t, i) => (
          <div key={t} style={{
            padding: '12px 0', marginRight: 22, fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: i === 0 ? RR.ink : RR.soft,
            borderBottom: i === 0 ? `2px solid ${RR.ink}` : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</div>
        ))}
      </div>

      {/* HEADLINE STAT */}
      <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${RR.hair}` }}>
        <Kicker>Avg revisions / article · today</Kicker>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div style={{ fontFamily: FONT.serif, fontSize: 64, lineHeight: 1, color: RR.ink }}>4.3</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: RR.red, padding: '2px 6px', border: `1px solid ${RR.red}`, borderRadius: 2,
          }}>↑ 18% vs 7d avg</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Sparkline data={SEV_7D} width={W - 36} height={42} color={RR.ink} fill={RR.ink}/>
        </div>
      </div>

      {/* OUTLET BARS */}
      <div style={{ padding: '20px 18px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <Kicker>Avg revisions per article</Kicker>
          <Mono style={{ color: RR.soft }}>BY OUTLET</Mono>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {outletStats.map(o => (
            <div key={o.k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 70, fontFamily: FONT.sans, fontSize: 11, color: RR.ink, fontWeight: 500 }}>
                {OUTLETS[o.k].short}
              </div>
              <div style={{ flex: 1, height: 18, background: RR.paper2, position: 'relative', border: `1px solid ${RR.hair}` }}>
                <div style={{
                  position: 'absolute', inset: 0, right: 'auto', width: `${(o.avg / maxAvg) * 100}%`,
                  background: o.avg >= 5 ? RR.red : o.avg >= 4 ? RR.amber : RR.ink2,
                }}/>
              </div>
              <div style={{ width: 30, textAlign: 'right', fontFamily: FONT.mono, fontSize: 11, color: RR.ink, fontWeight: 600 }}>
                {o.avg.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VOLATILITY CARD */}
      <div style={{ padding: '20px 18px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <Kicker>Volatility</Kicker>
          <div style={{ display: 'flex', gap: 4 }}>
            {['24h','7d','All'].map((w, i) => (
              <button key={w} style={{
                fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '4px 7px', borderRadius: 2,
                border: `1px solid ${i === 0 ? RR.ink : RR.hair2}`,
                background: i === 0 ? RR.ink : 'transparent', color: i === 0 ? RR.paper : RR.ink,
              }}>{w}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Sparkline data={SEV_24H} width={W - 36} height={70} color={RR.red} fill={RR.red}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', color: RR.soft }}>
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>

      {/* HOURLY CADENCE HEATBARS */}
      <div style={{ padding: '20px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Kicker>Edit frequency · by hour</Kicker>
          <Mono style={{ color: RR.soft }}>UTC</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
          {HOURLY.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: `${(v / maxH) * 100}%`,
                background: v === maxH ? RR.red : v >= maxH * 0.6 ? RR.ink : RR.ink2,
                opacity: v === 0 ? 0.1 : 1,
              }}/>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: FONT.mono, fontSize: 9, color: RR.soft, letterSpacing: '0.1em' }}>
          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
        </div>
        <div style={{
          marginTop: 16, padding: '12px 14px', background: RR.paper2, border: `1px solid ${RR.hair}`,
          fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 14, lineHeight: 1.4, color: RR.ink2,
        }}>
          Peak edit hour today: <SerifI style={{ color: RR.redDeep, fontStyle: 'normal', fontFamily: FONT.mono, fontSize: 12 }}>16:00 UTC</SerifI> — 15 edits, mostly headline reframings on the Norwegian gas story.
        </div>
      </div>

      <MTabbar active="stats"/>
    </MScreen>
  );
};

Object.assign(window, { MLanding, MFeed, MDetail, MSearch, MStats });
