/* Articles list / Feed — Readreceipt 2.0 */

const Feed = () => {
  const [outlet, setOutlet] = React.useState('all');
  const [sev, setSev] = React.useState(2);
  const [win, setWin] = React.useState('24h');
  const [sort, setSort] = React.useState('Latest');

  const types = ['Headline', 'Fact', 'Quote', 'Source', 'Addition', 'Deletion', 'Temporal', 'Routine'];
  const filtered = ARTICLES.filter(a =>
    a.sev >= sev && (outlet === 'all' || a.outlet === outlet)
  );

  return (
    <div style={{ width: '100%', minHeight: '100%', background: RR.paper, color: RR.ink, fontFamily: FONT.sans }}>
      {/* NAV */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px', borderBottom: `1px solid ${RR.hair}`, background: RR.paper,
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22 }}>Readreceipt</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Feed','Stats','Search','Method'].map(x => (
              <span key={x} style={{
                fontSize: 13, fontWeight: x === 'Feed' ? 600 : 500,
                color: x === 'Feed' ? RR.ink : RR.soft,
                borderBottom: x === 'Feed' ? `1.5px solid ${RR.ink}` : 'none',
                paddingBottom: 4,
              }}>{x}</span>
            ))}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
          border: `1px solid ${RR.hair2}`, background: RR.card, borderRadius: 2, minWidth: 320,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RR.soft} strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
          </svg>
          <span style={{ fontSize: 13, color: RR.mute, flex: 1 }}>Search headlines or paste a URL…</span>
          <Mono style={{ color: RR.mute, fontSize: 10, padding: '2px 5px', border: `1px solid ${RR.hair2}` }}>⌘K</Mono>
        </div>
      </div>

      {/* HEADER */}
      <div style={{ padding: '36px 48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <Kicker>The feed · Friday, May 8 2026</Kicker>
            <h1 style={{ fontFamily: FONT.serif, fontSize: 56, margin: '8px 0 0', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1 }}>
              <span style={{ fontStyle: 'italic' }}>Edits</span> in the last 24 hours.
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 36 }}>
            {[
              { v: filtered.length, l: 'IN VIEW' },
              { v: 1442, l: 'TOTAL EDITS' },
              { v: 38, l: 'SEV 4+', tone: 'red' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT.serif, fontSize: 32, color: s.tone === 'red' ? RR.red : RR.ink, lineHeight: 1 }}>{s.v.toLocaleString()}</div>
                <Kicker style={{ marginTop: 4, fontSize: 9 }}>{s.l}</Kicker>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ padding: '0 48px', borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '14px 0', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Kicker style={{ fontSize: 9 }}>Window</Kicker>
            <div style={{ display: 'flex', border: `1px solid ${RR.ink}`, borderRadius: 2, overflow: 'hidden' }}>
              {['24h','7d','30d','All'].map(w => (
                <button key={w} onClick={() => setWin(w)} style={{
                  background: win === w ? RR.ink : 'transparent', color: win === w ? RR.paper : RR.ink,
                  border: 'none', padding: '5px 12px', fontFamily: FONT.mono, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>{w}</button>
              ))}
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: RR.hair2 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Kicker style={{ fontSize: 9 }}>Min sev</Kicker>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setSev(s)} style={{
                  background: sev === s ? RR.ink : 'transparent', color: sev === s ? RR.paper : RR.ink,
                  border: `1px solid ${sev === s ? RR.ink : RR.hair2}`, padding: '3px 8px',
                  fontFamily: FONT.mono, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.08em',
                }}>S·{s}</button>
              ))}
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: RR.hair2 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 280 }}>
            <Kicker style={{ fontSize: 9 }}>Type</Kicker>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {types.map((t, i) => (
                <span key={t} style={{
                  fontFamily: FONT.mono, fontSize: 10, padding: '3px 8px', letterSpacing: '0.08em',
                  border: `1px solid ${i < 4 ? RR.ink : RR.hair2}`,
                  background: i < 4 ? RR.ink : 'transparent',
                  color: i < 4 ? RR.paper : RR.ink2, fontWeight: 600,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Kicker style={{ fontSize: 9 }}>Sort</Kicker>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono,
              fontSize: 11, color: RR.ink, fontWeight: 600,
              border: `1px solid ${RR.hair2}`, background: RR.card, padding: '4px 10px',
            }}>
              {sort} <span style={{ color: RR.mute }}>▾</span>
            </div>
          </div>
        </div>
      </div>

      {/* OUTLET TABS */}
      <div style={{ padding: '14px 48px', borderBottom: `1px solid ${RR.hair}`, display: 'flex', gap: 18, alignItems: 'center', overflowX: 'auto' }}>
        <button onClick={() => setOutlet('all')} style={{
          background: outlet === 'all' ? RR.ink : 'transparent', color: outlet === 'all' ? RR.paper : RR.ink,
          border: 'none', padding: '6px 12px', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
        }}>All outlets · 1,442</button>
        {Object.entries(OUTLETS).map(([k, o]) => (
          <button key={k} onClick={() => setOutlet(k)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '4px 0', flexShrink: 0,
            opacity: outlet === 'all' || outlet === k ? 1 : 0.4,
          }}>
            <img src={o.logo} alt={o.label} style={{ height: 14, width: 'auto', maxWidth: 56, objectFit: 'contain', filter: 'grayscale(1)' }}/>
            <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: '0.06em' }}>
              {Math.floor(20 + Math.random() * 280)}
            </Mono>
          </button>
        ))}
      </div>

      {/* LIST */}
      <div style={{ padding: '8px 48px 56px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '88px 130px 80px 1fr 110px 70px',
          gap: 20, padding: '14px 0', borderBottom: `1px solid ${RR.ink}`,
        }}>
          {['Time','Outlet','Sev','Headline · diff','Type','Edits'].map((h, i) => (
            <Kicker key={h} style={{ fontSize: 9, textAlign: i === 5 ? 'right' : 'left' }}>{h}</Kicker>
          ))}
        </div>
        {filtered.map((a, i) => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: '88px 130px 80px 1fr 110px 70px',
            gap: 20, padding: '20px 0', alignItems: 'flex-start',
            borderBottom: `1px solid ${RR.hair}`,
            background: i === 0 ? `linear-gradient(90deg, ${RR.paper2}, transparent 60%)` : 'transparent',
          }}>
            <div>
              <Mono style={{ fontSize: 11, color: RR.ink, letterSpacing: '0.06em', display: 'block' }}>{a.age}</Mono>
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.14em', marginTop: 2, display: 'block' }}>RR-{a.id}</Mono>
            </div>
            <OutletMark outlet={a.outlet} height={12}/>
            <SevPill s={a.sev}/>
            <div>
              <div style={{ fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.25, color: RR.ink, fontWeight: 400 }}>
                <span style={{ color: RR.soft, textDecoration: 'line-through', textDecorationColor: RR.red, textDecorationThickness: 1 }}>{a.headlineOrig}</span>
                <span style={{ color: RR.mute, margin: '0 6px' }}>→</span>
                <span style={{ borderBottom: `1.5px solid ${RR.green}` }}>{a.headline}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: RR.ink2, lineHeight: 1.45 }}>↳ {a.summary}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 14, alignItems: 'center' }}>
                <Mono style={{ fontSize: 9, color: RR.soft, letterSpacing: '0.14em' }}>VOL {a.vol}</Mono>
                <Mono style={{ fontSize: 9, color: RR.soft, letterSpacing: '0.14em' }}>{a.hours}H TRACKED</Mono>
                <span style={{ fontSize: 11, color: RR.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>Open timeline →</span>
              </div>
            </div>
            <div><TypeTag type={a.topType}/></div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 24, color: RR.ink, lineHeight: 1 }}>{a.changes}</div>
              <Sparkline data={[1,2,1,3,2,4,a.changes / 2, a.changes]} width={60} height={16} color={RR.ink}/>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button style={{
            background: 'transparent', color: RR.ink, border: `1px solid ${RR.ink}`, padding: '10px 20px',
            fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 2,
          }}>Load 24 more →</button>
        </div>
      </div>
    </div>
  );
};

window.Feed = Feed;
