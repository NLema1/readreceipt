/* Article timeline / detail — Readreceipt 2.0 */

const Detail = () => {
  const a = SPOTLIGHT;
  const [tab, setTab] = React.useState('Timeline');
  return (
    <div style={{ width: '100%', minHeight: '100%', background: RR.paper, color: RR.ink, fontFamily: FONT.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22 }}>Readreceipt</span>
          <Mono style={{ color: RR.soft, fontSize: 11 }}>← Back to feed</Mono>
        </div>
        <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: '0.16em' }}>RR-1042 · TRACKED 14H · LIVE</Mono>
      </div>

      {/* MASTHEAD */}
      <div style={{ padding: '40px 48px 28px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <OutletMark outlet="guardian" height={16}/>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: RR.mute }}/>
          <Mono style={{ color: RR.soft, fontSize: 11 }}>Environment · World</Mono>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: RR.mute }}/>
          <Mono style={{ color: RR.soft, fontSize: 11 }}>First seen 07:14 · 6 versions · 11 edits</Mono>
        </div>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 52, lineHeight: 1.05, margin: '0 0 12px', fontWeight: 400, letterSpacing: '-0.012em', textWrap: 'balance' }}>
          Norwegian government <span style={{ fontStyle: 'italic' }}>attacked</span> over decision to reopen North Sea gasfields
        </h1>
        <div style={{ fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.4, color: RR.soft, fontStyle: 'italic', maxWidth: 880 }}>
          ↳ originally: <span style={{ textDecoration: 'line-through', textDecorationColor: RR.red, textDecorationThickness: 1 }}>Norwegian government rebuked over decision to reopen North Sea gasfields</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: 28, borderTop: `1px solid ${RR.ink}` }}>
          {[
            { l: 'VERSIONS', v: '6' },
            { l: 'EDITS LOGGED', v: '11' },
            { l: 'VOLATILITY', v: '38', tone: 'red' },
            { l: 'MAX SEVERITY', v: 'S·4', tone: 'red' },
            { l: 'TRACKING UNTIL', v: 'May 15' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '16px 18px', borderRight: i < 4 ? `1px solid ${RR.hair}` : 'none' }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 30, lineHeight: 1, color: s.tone === 'red' ? RR.red : RR.ink }}>{s.v}</div>
              <Kicker style={{ marginTop: 6, fontSize: 9 }}>{s.l}</Kicker>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding: '0 48px', borderBottom: `1px solid ${RR.hair}`, display: 'flex', gap: 28 }}>
        {['Timeline','Diff viewer','All versions','Sources'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'transparent', border: 'none', padding: '14px 0', cursor: 'pointer',
            fontFamily: FONT.sans, fontSize: 13, fontWeight: tab === t ? 600 : 500,
            color: tab === t ? RR.ink : RR.soft,
            borderBottom: tab === t ? `2px solid ${RR.ink}` : '2px solid transparent',
          }}>{t}</button>
        ))}
      </div>

      {/* BODY */}
      <div style={{ padding: '32px 48px 48px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40 }}>
        {/* TIMELINE */}
        <div>
          <Kicker style={{ marginBottom: 16 }}>Revision log · 11 edits across 6 versions</Kicker>
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 1, background: RR.hair2 }}/>
            {a.changes.map((c, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: 22 }}>
                <div style={{
                  position: 'absolute', left: -27, top: 6, width: 18, height: 18, borderRadius: '50%',
                  border: `1.5px solid ${c.sev >= 4 ? RR.red : c.sev >= 3 ? RR.amber : RR.hair2}`,
                  background: RR.paper, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    width: c.sev >= 4 ? 10 : c.sev >= 3 ? 8 : 5, height: c.sev >= 4 ? 10 : c.sev >= 3 ? 8 : 5,
                    borderRadius: '50%', background: c.sev >= 5 ? RR.redDeep : c.sev >= 4 ? RR.red : c.sev >= 3 ? RR.amber : RR.mute,
                  }}/>
                </div>
                <div style={{
                  background: c.sev >= 4 ? RR.card : 'transparent',
                  border: c.sev >= 4 ? `1px solid ${RR.hair2}` : 'none',
                  padding: c.sev >= 4 ? '14px 18px' : '0 0 0 4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: '0.14em' }}>14:20 · today</Mono>
                    <SevPill s={c.sev}/>
                    <TypeTag type={c.type}/>
                    <span style={{ flex: 1 }}/>
                    <Mono style={{ fontSize: 10, color: RR.mute }}>v{6 - i}</Mono>
                  </div>
                  <div style={{ fontFamily: FONT.serif, fontSize: c.sev >= 4 ? 18 : 15, fontStyle: 'italic', color: RR.ink, lineHeight: 1.35, marginBottom: c.sev >= 3 ? 8 : 0 }}>
                    {c.summary}
                  </div>
                  {c.type === 'headline_change' && (
                    <Diff
                      oldText='"Norwegian government rebuked over decision to reopen North Sea gasfields"'
                      newText='"Norwegian government attacked over decision to reopen North Sea gasfields"'
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '18px 20px' }}>
            <Kicker style={{ marginBottom: 12 }}>Volatility · 14h window</Kicker>
            <div style={{ fontFamily: FONT.serif, fontSize: 44, lineHeight: 1, color: RR.red }}>38</div>
            <Sparkline data={[2,3,3,5,8,10,14,18,22,28,32,34,36,38]} width={310} height={50} color={RR.red} fill={RR.red}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.14em' }}>07:14</Mono>
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.14em' }}>NOW · 14:20</Mono>
            </div>
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '18px 20px' }}>
            <Kicker style={{ marginBottom: 12 }}>Edit composition</Kicker>
            {[
              { t: 'Headline', n: 1, c: RR.red },
              { t: 'Fact', n: 1, c: RR.red },
              { t: 'Quote', n: 1, c: RR.amber },
              { t: 'Addition', n: 4, c: RR.green },
              { t: 'Temporal', n: 1, c: RR.blue },
              { t: 'Other', n: 3, c: RR.soft },
            ].map(r => (
              <div key={r.t} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 24px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: '0.1em' }}>{r.t}</Mono>
                <div style={{ height: 6, background: RR.paper2, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(r.n / 4) * 100}%`, background: r.c }}/>
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: RR.ink, textAlign: 'right' }}>{r.n}</span>
              </div>
            ))}
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '18px 20px' }}>
            <Kicker style={{ marginBottom: 12 }}>Source</Kicker>
            <div style={{ fontSize: 12, color: RR.ink2, wordBreak: 'break-all', fontFamily: FONT.mono, lineHeight: 1.5 }}>
              theguardian.com/environment/2026/may/08/norwegian-government-north-sea
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ flex: 1, background: RR.ink, color: RR.paper, border: 'none', padding: '8px 12px', fontFamily: FONT.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 2 }}>Open original ↗</button>
              <button style={{ flex: 1, background: 'transparent', color: RR.ink, border: `1px solid ${RR.ink}`, padding: '8px 12px', fontFamily: FONT.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 2 }}>Cite ¶</button>
            </div>
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '18px 20px' }}>
            <Kicker style={{ marginBottom: 12 }}>Versions</Kicker>
            {a.versions.slice().reverse().map((v, i) => (
              <div key={v.v} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < a.versions.length - 1 ? `1px solid ${RR.hair}` : 'none',
              }}>
                <Mono style={{ fontSize: 10, color: RR.ink, fontWeight: 600, width: 24 }}>v{v.v}</Mono>
                <Mono style={{ fontSize: 10, color: RR.soft, width: 38 }}>{v.time}</Mono>
                <span style={{ fontSize: 11, color: RR.ink2, flex: 1 }}>{v.label.replace(/^v\d+ · /, '')}</span>
                {i === 0 && <Mono style={{ fontSize: 9, color: RR.green, letterSpacing: '0.14em' }}>LIVE</Mono>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Detail = Detail;
