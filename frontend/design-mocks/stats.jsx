/* Stats — Readreceipt 2.0 */

const Stats = () => {
  const [win, setWin] = React.useState('7d');

  // Average revisions / article by outlet (mock)
  const revPerOutlet = [
    { o: 'guardian',   v: 4.2 },
    { o: 'bbc',        v: 3.8 },
    { o: 'thehill',    v: 3.5 },
    { o: 'nypost',     v: 3.1 },
    { o: 'nbc',        v: 2.9 },
    { o: 'cbs',        v: 2.6 },
    { o: 'aljazeera',  v: 2.4 },
    { o: 'sky',        v: 2.2 },
    { o: 'fox',        v: 1.9 },
    { o: 'npr',        v: 1.7 },
    { o: 'propublica', v: 1.3 },
  ];
  const maxRev = 4.5;

  // Volatility series (24h hourly + 7d daily)
  const vol24 = SEV_24H;
  const vol7  = SEV_7D;

  // Heatmap: hour of day × day of week (mock counts)
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const heat = days.map((d, di) => Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-Math.pow((h - 11) / 5, 2)) + 0.3 * Math.exp(-Math.pow((h - 17) / 3, 2));
    const dayMult = di < 5 ? 1 : 0.55;
    const noise = 0.5 + Math.sin((h * 7 + di * 11) % 17) * 0.4;
    return Math.max(0, Math.round(peak * dayMult * 28 * noise));
  }));
  const maxHeat = Math.max(...heat.flat());

  // Edit type composition
  const typeMix = [
    { k: 'addition',         n: 421 },
    { k: 'temporal_update',  n: 318 },
    { k: 'other',            n: 192 },
    { k: 'headline_change',  n: 167 },
    { k: 'routine_update',   n: 142 },
    { k: 'fact_change',      n:  84 },
    { k: 'quote_change',     n:  62 },
    { k: 'source_removed',   n:  31 },
    { k: 'deletion',         n:  25 },
  ];
  const typeTotal = typeMix.reduce((s, x) => s + x.n, 0);

  return (
    <div style={{ width: '100%', minHeight: '100%', background: RR.paper, color: RR.ink, fontFamily: FONT.sans }}>
      {/* NAV */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22 }}>Readreceipt</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Feed','Stats','Search','Method'].map(x => (
              <span key={x} style={{
                fontSize: 13, fontWeight: x === 'Stats' ? 600 : 500,
                color: x === 'Stats' ? RR.ink : RR.soft,
                borderBottom: x === 'Stats' ? `1.5px solid ${RR.ink}` : 'none', paddingBottom: 4,
              }}>{x}</span>
            ))}
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div style={{ padding: '36px 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <Kicker>Statistics · public ledger</Kicker>
          <h1 style={{ fontFamily: FONT.serif, fontSize: 56, margin: '8px 0 0', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1 }}>
            Who edits, <span style={{ fontStyle: 'italic' }}>when, and how much.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', border: `1px solid ${RR.ink}`, borderRadius: 2, overflow: 'hidden' }}>
          {['24h','7d','30d','All'].map(w => (
            <button key={w} onClick={() => setWin(w)} style={{
              background: win === w ? RR.ink : 'transparent', color: win === w ? RR.paper : RR.ink,
              border: 'none', padding: '8px 16px', fontFamily: FONT.mono, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{w}</button>
          ))}
        </div>
      </div>

      {/* TOP STAT STRIP */}
      <div style={{ padding: '0 48px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: `2px solid ${RR.ink}`, borderBottom: `1px solid ${RR.hair}` }}>
          {[
            { v: '14,208', l: 'Articles tracked', s: '+312 this week', t: 'ink' },
            { v: '1,442',  l: 'Edits classified',  s: '+18% vs prior 7d', t: 'ink' },
            { v: '38',     l: 'Significant (S4+)', s: '2.6% of edits', t: 'red' },
            { v: '2.7',    l: 'Avg revisions / article', s: 'across 11 outlets', t: 'ink' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '20px 24px', borderRight: i < 3 ? `1px solid ${RR.hair}` : 'none' }}>
              <Kicker style={{ fontSize: 9 }}>{s.l}</Kicker>
              <div style={{ fontFamily: FONT.serif, fontSize: 48, lineHeight: 1, margin: '8px 0 6px', color: s.t === 'red' ? RR.red : RR.ink }}>{s.v}</div>
              <Mono style={{ fontSize: 11, color: RR.soft }}>{s.s}</Mono>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ padding: '0 48px 56px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* AVG REVISIONS */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic', margin: 0, fontWeight: 400 }}>Average revisions per article, by outlet</h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.14em' }}>WINDOW · {win.toUpperCase()}</Mono>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>Counts edits per article over its tracking window.</Mono>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {revPerOutlet.map((r, i) => (
              <div key={r.o} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', gap: 14, alignItems: 'center' }}>
                <OutletMark outlet={r.o} height={11}/>
                <div style={{ position: 'relative', height: 18, background: RR.paper2 }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${(r.v / maxRev) * 100}%`,
                    background: i < 3 ? RR.red : i < 6 ? RR.amber : RR.ink,
                  }}/>
                  <div style={{
                    position: 'absolute', left: `${(r.v / maxRev) * 100}%`, top: 0, bottom: 0,
                    width: 1, background: RR.ink2,
                  }}/>
                </div>
                <span style={{ fontFamily: FONT.serif, fontSize: 18, color: RR.ink, fontWeight: 400, textAlign: 'right' }}>{r.v.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <Hair style={{ marginTop: 18 }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Mono style={{ fontSize: 10, color: RR.mute, letterSpacing: '0.14em' }}>NETWORK AVG · 2.7</Mono>
            <Mono style={{ fontSize: 10, color: RR.mute, letterSpacing: '0.14em' }}>N = 14,208</Mono>
          </div>
        </div>

        {/* EDIT TYPE COMPOSITION */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px' }}>
          <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic', margin: 0, fontWeight: 400 }}>Edit composition</h3>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>What kinds of changes happen most.</Mono>

          {/* Stacked bar */}
          <div style={{ display: 'flex', height: 36, marginTop: 18, border: `1px solid ${RR.ink}` }}>
            {typeMix.map(r => {
              const t = typeOf(r.k);
              return <div key={r.k} title={t.label} style={{ flex: r.n, background: t.hue, opacity: 0.85 }}/>;
            })}
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {typeMix.map(r => {
              const t = typeOf(r.k);
              const pct = (r.n / typeTotal) * 100;
              return (
                <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '14px 100px 1fr 50px', gap: 10, alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, background: t.hue }}/>
                  <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: '0.1em' }}>{t.short}</Mono>
                  <div style={{ height: 4, background: RR.paper2 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: t.hue }}/>
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: RR.ink, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* VOLATILITY */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic', margin: 0, fontWeight: 400 }}>Volatility over time</h3>
              <Mono style={{ color: RR.mute, fontSize: 11 }}>Sum of severity per bucket. Higher = more meaningful change.</Mono>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT.serif, fontSize: 36, color: RR.red, lineHeight: 1 }}>1,442</div>
                <Kicker style={{ fontSize: 9, marginTop: 4 }}>Total · {win.toUpperCase()}</Kicker>
              </div>
              <div style={{ textAlign: 'right', borderLeft: `1px solid ${RR.hair}`, paddingLeft: 14 }}>
                <div style={{ fontFamily: FONT.serif, fontSize: 36, color: RR.ink, lineHeight: 1 }}>+18%</div>
                <Kicker style={{ fontSize: 9, marginTop: 4 }}>vs prior</Kicker>
              </div>
            </div>
          </div>

          {/* Big bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, paddingTop: 20, position: 'relative' }}>
            {[0.25, 0.5, 0.75, 1].map(p => (
              <div key={p} style={{
                position: 'absolute', left: 0, right: 0, bottom: `${p * 100}%`,
                borderTop: `1px dashed ${RR.hair2}`,
              }}>
                <Mono style={{ position: 'absolute', right: 0, top: -8, fontSize: 9, color: RR.mute, background: RR.card, padding: '0 4px' }}>
                  {Math.round(Math.max(...vol24) * p)}
                </Mono>
              </div>
            ))}
            {vol24.map((v, i) => {
              const max = Math.max(...vol24);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '100%', height: `${(v / max) * 100}%`,
                    background: v > max * 0.7 ? RR.red : v > max * 0.4 ? RR.amber : RR.ink,
                  }}/>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {vol24.map((_, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                {i % 4 === 0 && <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.06em' }}>{String(i).padStart(2, '0')}:00</Mono>}
              </div>
            ))}
          </div>
        </div>

        {/* HEATMAP */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic', margin: 0, fontWeight: 400 }}>When the news gets edited</h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.14em' }}>HOUR × DAY · LAST 4 WEEKS</Mono>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>Most edits land between 11:00–18:00 weekdays. Weekends are quiet.</Mono>

          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '34px 1fr 32px', gap: 8, alignItems: 'center' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 0 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ textAlign: 'center' }}>
                  {h % 3 === 0 && <Mono style={{ fontSize: 8, color: RR.mute, letterSpacing: '0.06em' }}>{String(h).padStart(2, '0')}</Mono>}
                </div>
              ))}
            </div>
            <div/>
            {heat.map((row, di) => (
              <React.Fragment key={di}>
                <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: '0.1em', textAlign: 'right' }}>{days[di]}</Mono>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
                  {row.map((v, hi) => {
                    const t = v / maxHeat;
                    const c = t > 0.7 ? RR.red : t > 0.45 ? RR.amber : RR.ink;
                    return <div key={hi} title={`${days[di]} ${hi}:00 — ${v} edits`} style={{
                      aspectRatio: '1', background: c, opacity: 0.1 + t * 0.9,
                    }}/>;
                  })}
                </div>
                <div/>
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8, alignItems: 'center' }}>
            <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.14em' }}>FEW</Mono>
            {[0.15, 0.3, 0.5, 0.7, 0.9].map(o => (
              <div key={o} style={{ width: 16, height: 10, background: o > 0.7 ? RR.red : o > 0.45 ? RR.amber : RR.ink, opacity: o }}/>
            ))}
            <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: '0.14em' }}>MANY</Mono>
          </div>
        </div>

        {/* OUTLET LEADERBOARD — significant edits */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: '24px 28px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: 'italic', margin: 0, fontWeight: 400 }}>Outlets ranked by significant edits</h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: '0.14em' }}>SEV ≥ 3 ONLY · {win.toUpperCase()}</Mono>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: `1px solid ${RR.ink}` }}>
            {revPerOutlet.slice(0, 8).map((r, i) => (
              <div key={r.o} style={{
                padding: '16px 18px',
                borderRight: i % 4 < 3 ? `1px solid ${RR.hair}` : 'none',
                borderBottom: i < 4 ? `1px solid ${RR.hair}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Mono style={{ fontSize: 11, color: RR.mute, letterSpacing: '0.16em' }}>#{i + 1}</Mono>
                  <SevDot s={i < 2 ? 5 : i < 4 ? 4 : 3} size={6}/>
                </div>
                <div style={{ marginTop: 8 }}><OutletMark outlet={r.o} height={13}/></div>
                <div style={{ fontFamily: FONT.serif, fontSize: 32, lineHeight: 1, marginTop: 10, color: RR.ink }}>{Math.floor(220 - i * 20)}</div>
                <Kicker style={{ marginTop: 4, fontSize: 9 }}>S3+ EDITS · {(r.v).toFixed(1)} avg/article</Kicker>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={[3,5,4,7,8,6,9,11].map(x => x * (1 - i * 0.07))} width={120} height={20} color={i < 2 ? RR.red : RR.ink} fill={i < 2 ? RR.red : RR.ink}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Stats = Stats;
