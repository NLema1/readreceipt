/* Landing page — Readreceipt 2.0 */

const Landing = () => {
  const top = ARTICLES.slice(0, 4);
  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: RR.paper, color: RR.ink,
      fontFamily: FONT.sans, position: 'relative', overflow: 'hidden',
    }}>
      {/* NAV */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 56px', borderBottom: `1px solid ${RR.hair}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 24, color: RR.ink }}>Readreceipt</span>
          <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>v2.0 · live</Mono>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['Feed', 'Stats', 'Search', 'Method'].map(x => (
            <span key={x} style={{ fontSize: 13, color: RR.ink2, fontWeight: 500 }}>{x}</span>
          ))}
          <button style={{
            background: RR.ink, color: RR.paper, border: 'none', padding: '9px 16px',
            fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 2,
          }}>Open the feed →</button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: '72px 56px 56px', display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 64, alignItems: 'start' }}>
        <div>
          <Kicker>Editorial accountability · since 2026</Kicker>
          <h1 style={{
            fontFamily: FONT.serif, fontSize: 84, lineHeight: 0.96, margin: '20px 0 24px',
            letterSpacing: '-0.015em', fontWeight: 400, color: RR.ink, textWrap: 'pretty',
          }}>
            Every quiet edit<br/>
            to the news,<br/>
            <span style={{ fontStyle: 'italic' }}>on the record.</span>
          </h1>
          <p style={{ fontFamily: FONT.serif, fontSize: 22, lineHeight: 1.42, color: RR.ink2, maxWidth: 560, margin: 0 }}>
            We watch eleven major outlets, snapshot every article, and flag the moments
            a headline shifts, a fact moves, or a source quietly disappears.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={{
              background: RR.ink, color: RR.paper, border: 'none', padding: '14px 22px',
              fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 2,
            }}>See today's tape →</button>
            <button style={{
              background: 'transparent', color: RR.ink, border: `1px solid ${RR.ink}`, padding: '14px 22px',
              fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 2,
            }}>Paste a URL</button>
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
            {[
              { v: '11', l: 'OUTLETS TRACKED' },
              { v: '14,208', l: 'ARTICLES IN INDEX' },
              { v: '1,442', l: 'EDITS · LAST 24H' },
              { v: '38', l: 'SIGNIFICANT TODAY', tone: 'red' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: FONT.serif, fontSize: 36, color: s.tone === 'red' ? RR.red : RR.ink, lineHeight: 1 }}>{s.v}</div>
                <Kicker style={{ marginTop: 6, fontSize: 9 }}>{s.l}</Kicker>
              </div>
            ))}
          </div>
        </div>

        {/* SAMPLE RECEIPT */}
        <div style={{ position: 'relative', paddingTop: 12 }}>
          <div style={{
            background: RR.card, border: `1px solid ${RR.hair2}`,
            padding: '24px 26px 20px', position: 'relative',
            boxShadow: '0 30px 60px -30px rgba(20,17,13,0.25), 0 4px 16px -8px rgba(20,17,13,0.10)',
            transform: 'rotate(0.6deg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <OutletMark outlet="guardian" height={13}/>
              <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: '0.12em' }}>RR-1042 · 14:20</Mono>
            </div>
            <Hair/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
              <SevPill s={4}/>
              <TypeTag type="headline_change"/>
              <span style={{ flex: 1 }}/>
              <Mono style={{ color: RR.soft, fontSize: 10 }}>v4 of 6</Mono>
            </div>
            <Diff
              oldText="Norwegian government rebuked over decision to reopen North Sea gasfields"
              newText="Norwegian government attacked over decision to reopen North Sea gasfields"
            />
            <div style={{
              marginTop: 16, padding: '12px 14px', background: RR.paper2,
              fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 14, lineHeight: 1.4, color: RR.ink2,
              borderLeft: `2px solid ${RR.red}`,
            }}>
              "Headline tone intensified from 'rebuked' to 'attacked'; minor copy edits in body."
              <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: RR.mute, marginTop: 8, fontStyle: 'normal' }}>
                — CLASSIFIED · CLAUDE HAIKU 4.5
              </div>
            </div>
            <Hair style={{ marginTop: 18 }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.14em' }}>11 EDITS LOGGED</Mono>
              <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.14em' }}>VOL · 38</Mono>
            </div>
          </div>
          <div style={{
            position: 'absolute', top: 220, right: -28, transform: 'rotate(6deg)',
            background: RR.card, border: `1px solid ${RR.hair2}`, padding: '12px 14px',
            boxShadow: '0 18px 36px -18px rgba(20,17,13,0.20)', maxWidth: 220,
          }}>
            <Mono style={{ fontSize: 9, letterSpacing: '0.18em', color: RR.amber }}>S·3 · TEMPORAL</Mono>
            <div style={{ fontFamily: FONT.serif, fontSize: 13, fontStyle: 'italic', color: RR.ink, marginTop: 6, lineHeight: 1.3 }}>
              Aid convoy <span style={{ textDecoration: 'line-through', textDecorationColor: RR.red, color: RR.soft }}>expected to enter</span> <span style={{ borderBottom: `1.5px solid ${RR.green}` }}>enters</span> southern corridor
            </div>
          </div>
        </div>
      </div>

      {/* OUTLET MARQUEE */}
      <div style={{ padding: '20px 56px', borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <Kicker style={{ flexShrink: 0 }}>Currently watching</Kicker>
          <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {Object.keys(OUTLETS).map(k => (
              <img key={k} src={OUTLETS[k].logo} alt={OUTLETS[k].label} style={{
                height: 18, width: 'auto', maxWidth: 70, objectFit: 'contain',
                filter: 'grayscale(1) contrast(1.05) opacity(0.75)'
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: '72px 56px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <Kicker>The method</Kicker>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 48, lineHeight: 1, margin: '12px 0 0', letterSpacing: '-0.01em', fontWeight: 400 }}>
              How a single edit becomes <span style={{ fontStyle: 'italic' }}>a receipt.</span>
            </h2>
          </div>
          <Mono style={{ color: RR.soft, fontSize: 11, letterSpacing: '0.16em' }}>5-MINUTE POLL · 7-DAY WINDOW</Mono>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {[
            { n: '01', t: 'Snapshot', d: 'A scheduler polls each outlet\'s RSS feed every 5 minutes. New articles enter a 7-day tracking window, captured every 30 minutes for the first day.' },
            { n: '02', t: 'Diff', d: 'Successive versions are compared at the word level. Whitespace, tracking pixels, and ad-tag noise are filtered before classification.' },
            { n: '03', t: 'Classify', d: 'Claude Haiku 4.5 reads both versions in context and answers a single question: would a careful reader come away with a different conclusion?' },
            { n: '04', t: 'Receipt', d: 'Severity 1–5 with one-sentence rationale. Receipts stay public, searchable, and citable forever.' },
          ].map(s => (
            <div key={s.n} style={{ borderTop: `2px solid ${RR.ink}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Mono style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em' }}>{s.n}</Mono>
                <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.18em' }}>STEP</Mono>
              </div>
              <div style={{ fontFamily: FONT.serif, fontSize: 26, fontStyle: 'italic', margin: '10px 0 8px', color: RR.ink }}>{s.t}</div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: RR.ink2, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SEVERITY LEGEND */}
      <div style={{ padding: '8px 56px 56px' }}>
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <Kicker>The severity scale</Kicker>
            <Mono style={{ color: RR.soft, fontSize: 11 }}>5 levels · meaning-preservation test</Mono>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
            {[
              { s: 1, l: 'Cosmetic', d: 'Whitespace, punctuation, link swap.' },
              { s: 2, l: 'Copy edit', d: 'Rephrasing or word swap; no meaning shift.' },
              { s: 3, l: 'Reframe', d: 'Added context, softened tone, shifted emphasis.' },
              { s: 4, l: 'Fact / quote', d: 'A verifiable claim or attribution moved.' },
              { s: 5, l: 'Correction', d: 'Substantive correction, retraction, reversal.' },
            ].map((x, i) => (
              <div key={x.s} style={{ padding: '4px 16px', borderLeft: i ? `1px solid ${RR.hair}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <SevDot s={x.s} size={8}/>
                  <SevPill s={x.s}/>
                </div>
                <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 18, color: RR.ink, marginBottom: 4 }}>{x.l}</div>
                <div style={{ fontSize: 12, lineHeight: 1.4, color: RR.ink2 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ARTICLE STRIP */}
      <div style={{ padding: '0 56px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: FONT.serif, fontSize: 32, margin: 0, fontWeight: 400, letterSpacing: '-0.005em' }}>
            <span style={{ fontStyle: 'italic' }}>On the tape</span> right now
          </h3>
          <span style={{ fontSize: 13, color: RR.ink2, textDecoration: 'underline', textUnderlineOffset: 4 }}>Open the full feed →</span>
        </div>
        <div style={{ borderTop: `1px solid ${RR.ink}` }}>
          {top.map(a => (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '110px 110px 1fr 90px 60px',
              gap: 24, alignItems: 'center', padding: '18px 0',
              borderBottom: `1px solid ${RR.hair}`,
            }}>
              <Mono style={{ color: RR.soft, fontSize: 11, letterSpacing: '0.1em' }}>{a.age}</Mono>
              <OutletMark outlet={a.outlet} height={12} mono/>
              <div>
                <div style={{ fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.25, color: RR.ink }}>{a.headline}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: RR.soft }}>↳ {a.summary}</div>
              </div>
              <TypeTag type={a.topType}/>
              <div style={{ textAlign: 'right' }}><SevPill s={a.sev}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '40px 56px 28px', borderTop: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontFamily: FONT.serif, fontSize: 28, fontStyle: 'italic' }}>Readreceipt</div>
            <div style={{ fontSize: 12, color: RR.soft, marginTop: 4 }}>An open ledger of editorial change. Open data, open API.</div>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: '0.16em' }}>
            POLLED EVERY 5 MIN · CLASSIFIED BY CLAUDE HAIKU 4.5 · MAY 8, 2026
          </Mono>
        </div>
      </div>
    </div>
  );
};

window.Landing = Landing;
