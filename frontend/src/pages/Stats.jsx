import { useMemo, useState } from "react";
import {
  FONT, RR,
  Hair, Kicker, Mono, OutletMark, SevDot, Sparkline,
  OUTLETS, OUTLET_KEYS, CHANGE_TYPES, typeOf,
} from "../components/atoms";
import { fetchStats, fetchRecentChanges } from "../api";
import { usePolling } from "../usePolling";
import { sinceFor } from "../lib/time";
import ErrorBanner from "../components/ErrorBanner";
import { WINDOW_KEYS } from "../constants";

export default function Stats() {
  const [windowKey, setWindowKey] = useState("7d");

  // sinceFor(windowKey) returns a fresh ISO string each call — never put it
  // in a usePolling deps array. Compute inside the lambda; key on windowKey.
  const statsQuery = usePolling(
    () => fetchStats({ minSeverity: 0, since: sinceFor(windowKey) }),
    60_000, [windowKey]
  );
  const recentQuery = usePolling(
    () => fetchRecentChanges({ minSeverity: 1, since: sinceFor(windowKey), limit: 500 }),
    60_000, [windowKey]
  );

  const stats = statsQuery.data;
  const recent = recentQuery.data || [];

  // ----- aggregations -----

  // 24-hourly bucket of severity sum (last 24h regardless of window)
  const sev24 = useMemo(() => {
    const buckets = new Array(24).fill(0);
    const cutoff = Date.now() - 86400e3;
    for (const c of recent) {
      const t = new Date(c.classified_at).getTime();
      if (t < cutoff) continue;
      const hour = new Date(t).getHours();
      buckets[hour] += c.severity || 1;
    }
    return buckets;
  }, [recent]);

  // Hour x DayOfWeek heatmap from full window
  const { heat, maxHeat } = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const c of recent) {
      const d = new Date(c.classified_at);
      // js: 0 sun ... 6 sat. Convert to mon=0..sun=6
      const day = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      grid[day][hour] += 1;
    }
    let m = 0;
    for (const row of grid) for (const v of row) if (v > m) m = v;
    return { heat: grid, maxHeat: m };
  }, [recent]);

  // Per-outlet aggregates: count of changes, avg severity, count of S3+
  const perOutlet = useMemo(() => {
    const byOutlet = new Map();
    for (const c of recent) {
      const o = c.article?.outlet || c.outlet;
      if (!o) continue;
      if (!byOutlet.has(o)) byOutlet.set(o, { count: 0, sev3plus: 0, sevSum: 0, articles: new Set() });
      const r = byOutlet.get(o);
      r.count += 1;
      r.sevSum += c.severity || 0;
      if ((c.severity || 0) >= 3) r.sev3plus += 1;
      const aid = c.article?.id ?? c.article_id;
      if (aid) r.articles.add(aid);
    }
    const rows = OUTLET_KEYS.map((k) => {
      const r = byOutlet.get(k) || { count: 0, sev3plus: 0, sevSum: 0, articles: new Set() };
      const articles = r.articles.size || 0;
      return {
        outlet: k,
        avg: articles ? r.count / articles : 0,
        count: r.count,
        sev3plus: r.sev3plus,
        articles,
      };
    });
    rows.sort((a, b) => b.avg - a.avg);
    return rows;
  }, [recent]);

  const maxAvg = Math.max(...perOutlet.map((r) => r.avg), 1);

  // Type mix (from API /stats.by_type fallback to client compute)
  const typeMix = useMemo(() => {
    if (stats?.by_type?.length) {
      return stats.by_type.map((r) => ({ k: r.change_type, n: r.count }));
    }
    const m = new Map();
    for (const c of recent) {
      const t = c.change_type || "other";
      m.set(t, (m.get(t) || 0) + 1);
    }
    return Array.from(m.entries()).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  }, [stats, recent]);
  const typeTotal = typeMix.reduce((s, r) => s + r.n, 0) || 1;

  // Top numbers
  const totalArticles = stats?.articles ?? 0;
  const totalEdits = stats?.edits ?? recent.filter((c) => (c.severity || 0) >= 3).length;
  const totalSig = stats?.vibe_shifts ?? recent.filter((c) => (c.severity || 0) >= 4).length;
  const networkAvg = totalArticles ? (totalEdits / totalArticles).toFixed(1) : "—";

  // ---------- DESKTOP ----------
  const desktop = (
    <div className="hidden md:block">
      <div
        style={{
          padding: "36px 48px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <div>
          <Kicker>Statistics · public ledger</Kicker>
          <h1
            style={{
              fontFamily: FONT.serif,
              fontSize: 56,
              margin: "8px 0 0",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Who edits, <span style={{ fontStyle: "italic" }}>when, and how much.</span>
          </h1>
        </div>
        <div style={{ display: "flex", border: `1px solid ${RR.ink}`, borderRadius: 2, overflow: "hidden" }}>
          {WINDOW_KEYS.map((w) => {
            const on = windowKey === w;
            return (
              <button
                key={w}
                onClick={() => setWindowKey(w)}
                style={{
                  background: on ? RR.ink : "transparent",
                  color: on ? RR.paper : RR.ink,
                  border: "none",
                  padding: "8px 16px",
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {w === "all" ? "All" : w}
              </button>
            );
          })}
        </div>
      </div>

      {/* TOP STAT STRIP */}
      <div style={{ padding: "0 48px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            borderTop: `2px solid ${RR.ink}`,
            borderBottom: `1px solid ${RR.hair}`,
          }}
        >
          {[
            { v: totalArticles.toLocaleString(), l: "Articles tracked", s: `Window · ${windowKey.toUpperCase()}`, t: "ink" },
            { v: totalEdits.toLocaleString(),    l: "Edits classified", s: "Severity ≥ 3", t: "ink" },
            { v: totalSig.toLocaleString(),      l: "Significant (S4+)", s: totalEdits ? `${((totalSig / totalEdits) * 100).toFixed(1)}% of edits` : "—", t: "red" },
            { v: networkAvg,                     l: "Avg edits / article", s: "across 11 outlets", t: "ink" },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: "20px 24px", borderRight: i < 3 ? `1px solid ${RR.hair}` : "none" }}>
              <Kicker style={{ fontSize: 9 }}>{s.l}</Kicker>
              <div
                style={{
                  fontFamily: FONT.serif,
                  fontSize: 48,
                  lineHeight: 1,
                  margin: "8px 0 6px",
                  color: s.t === "red" ? RR.red : RR.ink,
                }}
              >
                {s.v}
              </div>
              <Mono style={{ fontSize: 11, color: RR.soft }}>{s.s}</Mono>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ padding: "0 48px 56px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        {/* AVG REVISIONS BY OUTLET */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
              Average edits per article, by outlet
            </h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.14em" }}>
              WINDOW · {windowKey.toUpperCase()}
            </Mono>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>
            Counts edits per article over its tracking window.
          </Mono>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            {perOutlet.map((r, i) => (
              <div
                key={r.outlet}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 60px",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT.sans,
                    fontSize: 13,
                    color: RR.ink,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {OUTLETS[r.outlet].label}
                </div>
                <div style={{ position: "relative", height: 18, background: RR.paper2 }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${(r.avg / maxAvg) * 100}%`,
                      background: i < 3 ? RR.red : i < 6 ? RR.amber : RR.ink,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: FONT.serif,
                    fontSize: 18,
                    color: RR.ink,
                    fontWeight: 400,
                    textAlign: "right",
                  }}
                >
                  {r.avg ? r.avg.toFixed(1) : "—"}
                </span>
              </div>
            ))}
          </div>
          <Hair style={{ marginTop: 18 }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <Mono style={{ fontSize: 10, color: RR.mute, letterSpacing: "0.14em" }}>
              NETWORK AVG · {networkAvg}
            </Mono>
            <Mono style={{ fontSize: 10, color: RR.mute, letterSpacing: "0.14em" }}>
              N = {totalArticles.toLocaleString()}
            </Mono>
          </div>
        </div>

        {/* EDIT TYPE COMPOSITION */}
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "24px 28px" }}>
          <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
            Edit composition
          </h3>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>What kinds of changes happen most.</Mono>
          {/* Stacked bar */}
          <div style={{ display: "flex", height: 36, marginTop: 18, border: `1px solid ${RR.ink}` }}>
            {typeMix.map((r) => {
              const t = typeOf(r.k);
              return <div key={r.k} title={`${t.label} · ${r.n}`} style={{ flex: r.n, background: t.hue, opacity: 0.85 }} />;
            })}
          </div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 7 }}>
            {typeMix.map((r) => {
              const t = typeOf(r.k);
              const pct = (r.n / typeTotal) * 100;
              return (
                <div
                  key={r.k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "14px 100px 1fr 50px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <span style={{ width: 10, height: 10, background: t.hue }} />
                  <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: "0.1em" }}>{t.short}</Mono>
                  <div style={{ height: 4, background: RR.paper2 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: t.hue }} />
                  </div>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 11,
                      fontWeight: 600,
                      color: RR.ink,
                      textAlign: "right",
                    }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            {typeMix.length === 0 && (
              <Mono style={{ color: RR.soft }}>No classified edits in this window.</Mono>
            )}
          </div>
        </div>

        {/* VOLATILITY 24H */}
        <div
          style={{
            background: RR.card,
            border: `1px solid ${RR.hair2}`,
            padding: "24px 28px",
            gridColumn: "span 2",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
                Volatility · last 24h
              </h3>
              <Mono style={{ color: RR.mute, fontSize: 11 }}>
                Sum of severity per hour. Higher = more meaningful change.
              </Mono>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONT.serif, fontSize: 36, color: RR.red, lineHeight: 1 }}>
                  {sev24.reduce((a, b) => a + b, 0)}
                </div>
                <Kicker style={{ fontSize: 9, marginTop: 4 }}>Total · 24H</Kicker>
              </div>
            </div>
          </div>
          <BarChart24 data={sev24} />
        </div>

        {/* HEATMAP */}
        <div
          style={{
            background: RR.card,
            border: `1px solid ${RR.hair2}`,
            padding: "24px 28px",
            gridColumn: "span 2",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
              When the news gets edited
            </h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.14em" }}>
              HOUR × DAY · WINDOW {windowKey.toUpperCase()}
            </Mono>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 11 }}>
            Cells coloured by edit count. Empty cells dimmed.
          </Mono>
          <Heatmap heat={heat} maxHeat={maxHeat} />
        </div>

        {/* OUTLET LEADERBOARD — significant edits */}
        <div
          style={{
            background: RR.card,
            border: `1px solid ${RR.hair2}`,
            padding: "24px 28px",
            gridColumn: "span 2",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
              Outlets ranked by significant edits
            </h3>
            <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.14em" }}>
              SEV ≥ 3 · {windowKey.toUpperCase()}
            </Mono>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              borderTop: `1px solid ${RR.ink}`,
            }}
          >
            {[...perOutlet].sort((a, b) => b.sev3plus - a.sev3plus).slice(0, 8).map((r, i) => (
              <div
                key={r.outlet}
                style={{
                  padding: "16px 18px",
                  borderRight: i % 4 < 3 ? `1px solid ${RR.hair}` : "none",
                  borderBottom: i < 4 ? `1px solid ${RR.hair}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Mono style={{ fontSize: 11, color: RR.mute, letterSpacing: "0.16em" }}>#{i + 1}</Mono>
                  <SevDot s={i < 2 ? 5 : i < 4 ? 4 : 3} size={6} />
                </div>
                <div style={{ marginTop: 10, minHeight: 32, display: "flex", alignItems: "center" }}>
                  <OutletMark outlet={r.outlet} height={20} withName={false} />
                </div>
                <div
                  style={{
                    fontFamily: FONT.serif,
                    fontSize: 32,
                    lineHeight: 1,
                    marginTop: 10,
                    color: RR.ink,
                  }}
                >
                  {r.sev3plus}
                </div>
                <Kicker style={{ marginTop: 4, fontSize: 9 }}>
                  S3+ EDITS · {r.avg ? r.avg.toFixed(1) : "—"} avg/article
                </Kicker>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- MOBILE ----------
  const mobile = (
    <div className="md:hidden">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: `1px solid ${RR.hair}`,
          background: RR.paper,
        }}
      >
        <div>
          <Kicker>Readreceipt</Kicker>
          <div style={{ fontFamily: FONT.serif, fontSize: 24, lineHeight: 1, color: RR.ink, marginTop: 2 }}>
            Stats
          </div>
          <div style={{ fontSize: 11, color: RR.soft, marginTop: 4 }}>
            {totalArticles.toLocaleString()} articles · {totalEdits.toLocaleString()} edits
          </div>
        </div>
      </div>

      {/* window pills */}
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 4,
          padding: "10px 18px",
          overflowX: "auto",
          borderBottom: `1px solid ${RR.hair}`,
          background: RR.paper,
        }}
      >
        {WINDOW_KEYS.map((w) => {
          const on = windowKey === w;
          return (
            <button
              key={w}
              onClick={() => setWindowKey(w)}
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "6px 9px",
                borderRadius: 2,
                border: `1px solid ${on ? RR.ink : RR.hair2}`,
                background: on ? RR.ink : "transparent",
                color: on ? RR.paper : RR.ink,
                cursor: "pointer",
              }}
            >
              {w === "all" ? "All" : w}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "20px 18px 18px", borderBottom: `1px solid ${RR.hair}` }}>
        <Kicker>Avg edits / article</Kicker>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <div style={{ fontFamily: FONT.serif, fontSize: 64, lineHeight: 1, color: RR.ink }}>
            {networkAvg}
          </div>
          <Mono
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: RR.red,
              padding: "2px 6px",
              border: `1px solid ${RR.red}`,
              borderRadius: 2,
              textTransform: "uppercase",
            }}
          >
            {totalSig} S4+ today
          </Mono>
        </div>
        <div style={{ marginTop: 10 }}>
          <Sparkline data={sev24} width={339} height={42} color={RR.ink} fill={RR.ink} />
        </div>
      </div>

      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <Kicker>Edits per article</Kicker>
          <Mono style={{ color: RR.soft }}>BY OUTLET</Mono>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {perOutlet.map((r) => (
            <div key={r.outlet} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 70, fontFamily: FONT.sans, fontSize: 11, color: RR.ink, fontWeight: 500 }}>
                {OUTLETS[r.outlet].short}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 18,
                  background: RR.paper2,
                  position: "relative",
                  border: `1px solid ${RR.hair}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${(r.avg / maxAvg) * 100}%`,
                    background: r.avg >= maxAvg * 0.66 ? RR.red : r.avg >= maxAvg * 0.33 ? RR.amber : RR.ink2,
                  }}
                />
              </div>
              <div
                style={{
                  width: 30,
                  textAlign: "right",
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  color: RR.ink,
                  fontWeight: 600,
                }}
              >
                {r.avg ? r.avg.toFixed(1) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 18px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <Kicker>Edit frequency · by hour</Kicker>
          <Mono style={{ color: RR.soft }}>LAST 24H</Mono>
        </div>
        <BarChart24 data={sev24} compact />
      </div>
    </div>
  );

  return (
    <>
      <ErrorBanner queries={[statsQuery, recentQuery]} />
      {desktop}
      {mobile}
    </>
  );
}

function BarChart24({ data, compact }) {
  const max = Math.max(...data, 1);
  const height = compact ? 100 : 180;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height,
          paddingTop: 20,
          position: "relative",
        }}
      >
        {!compact && [0.25, 0.5, 0.75, 1].map((p) => (
          <div
            key={p}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${p * 100}%`,
              borderTop: `1px dashed ${RR.hair2}`,
            }}
          >
            <Mono
              style={{
                position: "absolute",
                right: 0,
                top: -8,
                fontSize: 9,
                color: RR.mute,
                background: RR.card,
                padding: "0 4px",
              }}
            >
              {Math.round(max * p)}
            </Mono>
          </div>
        ))}
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              zIndex: 1,
              alignSelf: "stretch",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${(v / max) * 100}%`,
                background: v > max * 0.7 ? RR.red : v > max * 0.4 ? RR.amber : RR.ink,
                opacity: v === 0 ? 0.1 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {data.map((_, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            {i % 4 === 0 && (
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.06em" }}>
                {String(i).padStart(2, "0")}:00
              </Mono>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ heat, maxHeat }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const safeMax = maxHeat || 1;
  return (
    <div
      style={{
        marginTop: 22,
        display: "grid",
        gridTemplateColumns: "34px 1fr 32px",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 0 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ textAlign: "center" }}>
            {h % 3 === 0 && (
              <Mono style={{ fontSize: 8, color: RR.mute, letterSpacing: "0.06em" }}>
                {String(h).padStart(2, "0")}
              </Mono>
            )}
          </div>
        ))}
      </div>
      <div />
      {heat.map((row, di) => (
        <div key={di} style={{ display: "contents" }}>
          <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: "0.1em", textAlign: "right" }}>
            {days[di]}
          </Mono>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2 }}>
            {row.map((v, hi) => {
              const t = v / safeMax;
              const c = t > 0.7 ? RR.red : t > 0.45 ? RR.amber : RR.ink;
              return (
                <div
                  key={hi}
                  title={`${days[di]} ${hi}:00 — ${v} edits`}
                  style={{ aspectRatio: "1", background: c, opacity: 0.1 + t * 0.9 }}
                />
              );
            })}
          </div>
          <div />
        </div>
      ))}
      <div />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, gap: 8, alignItems: "center" }}>
        <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.14em" }}>FEW</Mono>
        {[0.15, 0.3, 0.5, 0.7, 0.9].map((o) => (
          <div
            key={o}
            style={{ width: 16, height: 10, background: o > 0.7 ? RR.red : o > 0.45 ? RR.amber : RR.ink, opacity: o }}
          />
        ))}
        <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.14em" }}>MANY</Mono>
      </div>
      <div />
    </div>
  );
}
