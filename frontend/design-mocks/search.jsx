/* Search — Readreceipt 2.0 (full page + spotlight palette overlay shown on right side) */

const Search = () => {
  const [q, setQ] = React.useState('hedge funds');
  const [outlets, setOutlets] = React.useState({ guardian: true, npr: true, bbc: true });
  const [sev, setSev] = React.useState([3, 5]);
  const [types, setTypes] = React.useState({ headline_change: true, fact_change: true });

  return (
    <div style={{ width: '100%', minHeight: '100%', background: RR.paper, color: RR.ink, fontFamily: FONT.sans }}>
      {/* NAV */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22 }}>Readreceipt</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Feed','Stats','Search','Method'].map(x => (
              <span key={x} style={{
                fontSize: 13, fontWeight: x === 'Search' ? 600 : 500,
                color: x === 'Search' ? RR.ink : RR.soft,
                borderBottom: x === 'Search' ? `1.5px solid ${RR.ink}` : 'none', paddingBottom: 4,
              }}>{x}</span>
            ))}
          </div>
        </div>
      </div>

      {/* BIG SEARCH */}
      <div style={{ padding: '48px 48px 24px' }}>
        <Kicker>Search the full ledger · 14,208 articles · 1.2M edits</Kicker>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 16,
          borderBottom: `2px solid ${RR.ink}`, padding: '8px 0',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RR.ink} strokeWidth="1.8">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search headlines, paste any article URL, or describe an edit…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 32, color: RR.ink,
              padding: '6px 0',
            }}
          />
          <Mono style={{ color: RR.mute, fontSize: 10, padding: '4px 8px', border: `1px solid ${RR.hair2}` }}>⌘K</Mono>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.16em' }}>SUGGESTED:</Mono>
          {['url:theguardian.com/...', 'outlet:bbc severity:4+', 'type:source_removed', 'since:24h "Senate"', '"casualty count revised"'].map(s => (
            <span key={s} style={{
              fontFamily: FONT.mono, fontSize: 11, color: RR.ink2, padding: '4px 10px',
              border: `1px solid ${RR.hair2}`, background: RR.card, borderRadius: 2, cursor: 'pointer',
            }}>{s}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 48px 56px', display: 'grid', gridTemplateColumns: '260px 1fr 360px', gap: 32 }}>
        {/* FILTER RAIL */}
        <div style={{ borderRight: `1px solid ${RR.hair}`, paddingRight: 24 }}>
          <Kicker style={{ marginBottom: 10 }}>Outlet</Kicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {Object.entries(OUTLETS).map(([k, o]) => {
              const on = outlets[k];
              return (
                <button key={k} onClick={() => setOutlets({ ...outlets, [k]: !on })} style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: 'transparent',
                  border: 'none', padding: '4px 0', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{
                    width: 12, height: 12, border: `1.5px solid ${on ? RR.ink : RR.hair2}`,
                    background: on ? RR.ink : 'transparent', borderRadius: 2, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{on && <span style={{ color: RR.paper, fontSize: 9, fontWeight: 700 }}>✓</span>}</span>
                  <img src={o.logo} alt={o.label} style={{ height: 12, maxWidth: 60, filter: 'grayscale(1)' }}/>
                  <span style={{ flex: 1 }}/>
                  <Mono style={{ fontSize: 10, color: RR.mute }}>{Math.floor(20 + Math.random() * 280)}</Mono>
                </button>
              );
            })}
          </div>

          <Kicker style={{ marginBottom: 10 }}>Severity range</Kicker>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <Mono style={{ fontSize: 11, color: RR.ink, fontWeight: 600 }}>S·{sev[0]}</Mono>
            <Mono style={{ fontSize: 11, color: RR.ink, fontWeight: 600 }}>S·{sev[1]}</Mono>
          </div>
          <div style={{ position: 'relative', height: 6, background: RR.paper2, marginBottom: 24 }}>
            <div style={{ position: 'absolute', left: `${(sev[0]-1)*25}%`, right: `${(5-sev[1])*25}%`, top: 0, bottom: 0, background: RR.ink }}/>
            <div style={{ position: 'absolute', left: `${(sev[0]-1)*25}%`, top: -3, width: 12, height: 12, background: RR.ink, transform: 'translateX(-6px)' }}/>
            <div style={{ position: 'absolute', left: `${(sev[1]-1)*25}%`, top: -3, width: 12, height: 12, background: RR.red, transform: 'translateX(-6px)' }}/>
          </div>

          <Kicker style={{ marginBottom: 10 }}>Edit type</Kicker>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {Object.entries(CHANGE_TYPES).map(([k, t]) => {
              const on = types[k];
              return (
                <button key={k} onClick={() => setTypes({ ...types, [k]: !on })} style={{
                  fontFamily: FONT.mono, fontSize: 10, padding: '4px 8px', letterSpacing: '0.08em',
                  border: `1px solid ${on ? RR.ink : RR.hair2}`,
                  background: on ? RR.ink : 'transparent',
                  color: on ? RR.paper : RR.ink2, fontWeight: 600,
                  textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                }}>{t.short}</button>
              );
            })}
          </div>

          <Kicker style={{ marginBottom: 10 }}>Window</Kicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Custom…', 'All time'].map((w, i) => (
              <button key={w} style={{
                background: i === 1 ? RR.ink : 'transparent', color: i === 1 ? RR.paper : RR.ink,
                border: `1px solid ${i === 1 ? RR.ink : RR.hair2}`, padding: '6px 10px', fontFamily: FONT.sans,
                fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', borderRadius: 2,
              }}>{w}</button>
            ))}
          </div>
        </div>

        {/* RESULTS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic' }}>
              <span style={{ color: RR.red }}>847 results</span> for <span style={{ background: `${RR.amber}22`, padding: '0 6px' }}>"hedge funds"</span>
            </div>
            <Mono style={{ color: RR.soft, fontSize: 11 }}>Sorted by relevance ▾</Mono>
          </div>
          <Hair style={{ marginBottom: 0, background: RR.ink, height: 1 }}/>
          {ARTICLES.slice(2, 7).map(a => (
            <div key={a.id} style={{ padding: '20px 0', borderBottom: `1px solid ${RR.hair}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <OutletMark outlet={a.outlet} height={11}/>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: RR.mute }}/>
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: '0.12em' }}>{a.age}</Mono>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: RR.mute }}/>
                <SevPill s={a.sev}/>
                <TypeTag type={a.topType}/>
              </div>
              <div style={{ fontFamily: FONT.serif, fontSize: 22, lineHeight: 1.25, color: RR.ink }}>
                Senate moves to restrict <span style={{ background: `${RR.amber}33`, padding: '0 4px' }}>hedge funds</span> as bipartisan deal solidifies
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: RR.ink2, lineHeight: 1.5 }}>
                ↳ {a.summary}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 18, alignItems: 'center' }}>
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: '0.14em' }}>RR-{a.id}</Mono>
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: '0.14em' }}>{a.changes} EDITS · VOL {a.vol}</Mono>
                <span style={{ fontSize: 12, color: RR.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>Open timeline →</span>
              </div>
            </div>
          ))}
        </div>

        {/* COMMAND PALETTE PREVIEW (right column) */}
        <div>
          <Kicker style={{ marginBottom: 10 }}>Quick lookup · ⌘K</Kicker>
          <div style={{
            background: RR.ink, color: RR.paper, padding: '16px 18px', borderRadius: 4,
            boxShadow: '0 30px 60px -30px rgba(20,17,13,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid #2a241b` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RR.paper} strokeWidth="1.8" opacity="0.6">
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
              </svg>
              <span style={{ fontFamily: FONT.sans, fontSize: 13, opacity: 0.6 }}>Paste a URL or type to search…</span>
            </div>
            <div style={{ paddingTop: 10 }}>
              <Mono style={{ fontSize: 9, color: '#8a7e6a', letterSpacing: '0.18em', display: 'block', marginBottom: 6 }}>SUGGESTED</Mono>
              {[
                { k: '↵', t: 'Search "hedge funds"', s: '847 results' },
                { k: 'g', t: 'Filter by Guardian', s: '203 results' },
                { k: '4', t: 'Min severity 4+', s: '38 results' },
                { k: '⏎', t: 'Open RR-1019', s: 'Senate · NPR' },
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px',
                  background: i === 0 ? '#1f1a11' : 'transparent', borderRadius: 3, margin: '0 -6px',
                }}>
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 10, padding: '2px 6px',
                    border: `1px solid #3a3128`, color: '#a8946a', borderRadius: 2,
                  }}>{r.k}</span>
                  <span style={{ fontSize: 13, color: RR.paper, flex: 1 }}>{r.t}</span>
                  <Mono style={{ fontSize: 10, color: '#8a7e6a' }}>{r.s}</Mono>
                </div>
              ))}
            </div>
          </div>
          <Mono style={{ display: 'block', marginTop: 14, color: RR.mute, fontSize: 10, letterSpacing: '0.14em', lineHeight: 1.6 }}>
            PRESS ⌘K ANYWHERE.<br/>
            URL DETECTED → JUMPS TO RECEIPT.<br/>
            ↑↓ NAVIGATE · ⏎ OPEN.
          </Mono>
        </div>
      </div>
    </div>
  );
};

window.Search = Search;
