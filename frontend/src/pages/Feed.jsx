import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FONT, RR,
  Hair, Kicker, Mono, OutletMark, SevPill, Sparkline, TypeTag,
  OUTLETS, OUTLET_KEYS, CHANGE_TYPES, CHANGE_TYPE_KEYS,
} from "../components/atoms";
import { fetchArticles, fetchRecentChanges, fetchStats } from "../api";
import { usePolling } from "../usePolling";

// ----------------------------------------------------------------------------
// data helpers (Feed-local; do not depend on legacy lib/receipt.js)
// ----------------------------------------------------------------------------

function sinceFor(window) {
  if (window === "all") return "all";
  const now = Date.now();
  const d =
    window === "24h" ? 24 * 3600 * 1000 :
    window === "7d"  ? 7  * 24 * 3600 * 1000 :
    window === "30d" ? 30 * 24 * 3600 * 1000 :
                       7  * 24 * 3600 * 1000;
  return new Date(now - d).toISOString();
}

function changesByArticle(recent) {
  const map = new Map();
  if (!recent) return map;
  for (const c of recent) {
    const id = c.article?.id ?? c.article_id;
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(c);
  }
  return map;
}

function topChange(changes) {
  if (!changes || changes.length === 0) return null;
  let best = changes[0];
  for (const c of changes) if ((c.severity || 0) > (best.severity || 0)) best = c;
  return best;
}

function latestChangeIso(changes) {
  if (!changes || changes.length === 0) return null;
  let latest = null;
  for (const c of changes) {
    const iso = c.classified_at;
    if (!iso) continue;
    if (!latest || iso > latest) latest = iso;
  }
  return latest;
}

function volatility(changes) {
  if (!changes) return 0;
  return changes.reduce((s, c) => s + (c.severity || 0), 0);
}

function ageLabel(iso) {
  if (!iso) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function hoursTracked(firstSeenIso) {
  if (!firstSeenIso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(firstSeenIso).getTime()) / 3_600_000));
}

// Spark data: fake-but-consistent per article id, scaled to its change count
function sparkData(id, changeCount) {
  const seed = id || 1;
  const base = Math.max(2, Math.min(changeCount || 2, 14));
  return Array.from({ length: 8 }, (_, i) => ((seed * 7 + i * i * 3) % 14) + 1 + (i === 7 ? base / 2 : 0));
}

// ----------------------------------------------------------------------------
// Filter strip (desktop)
// ----------------------------------------------------------------------------

function FilterBar({ window, setWindow, sev, setSev, types, setTypes }) {
  return (
    <div
      style={{
        padding: "0 48px",
        borderTop: `1px solid ${RR.hair}`,
        borderBottom: `1px solid ${RR.hair}`,
        background: RR.paper2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "14px 0", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Kicker style={{ fontSize: 9 }}>Window</Kicker>
          <div style={{ display: "flex", border: `1px solid ${RR.ink}`, borderRadius: 2, overflow: "hidden" }}>
            {["24h", "7d", "30d", "all"].map((w) => {
              const active = window === w;
              return (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  style={{
                    background: active ? RR.ink : "transparent",
                    color: active ? RR.paper : RR.ink,
                    border: "none",
                    padding: "5px 12px",
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {w === "all" ? "All" : w}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ width: 1, height: 22, background: RR.hair2 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Kicker style={{ fontSize: 9 }}>Min sev</Kicker>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const active = sev === s;
              return (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  style={{
                    background: active ? RR.ink : "transparent",
                    color: active ? RR.paper : RR.ink,
                    border: `1px solid ${active ? RR.ink : RR.hair2}`,
                    padding: "3px 8px",
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                  }}
                >
                  S·{s}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ width: 1, height: 22, background: RR.hair2 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 280 }}>
          <Kicker style={{ fontSize: 9 }}>Type</Kicker>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CHANGE_TYPE_KEYS.filter((k) => k !== "other").map((k) => {
              const t = CHANGE_TYPES[k];
              const active = types.has(k);
              return (
                <button
                  key={k}
                  onClick={() => {
                    const next = new Set(types);
                    if (active) next.delete(k);
                    else next.add(k);
                    setTypes(next);
                  }}
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    padding: "3px 8px",
                    letterSpacing: "0.08em",
                    border: `1px solid ${active ? RR.ink : RR.hair2}`,
                    background: active ? RR.ink : "transparent",
                    color: active ? RR.paper : RR.ink2,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {t.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OutletTabs({ outlet, setOutlet, perOutletCount, total }) {
  return (
    <div
      className="no-scrollbar"
      style={{
        padding: "14px 48px",
        borderBottom: `1px solid ${RR.hair}`,
        display: "flex",
        gap: 18,
        alignItems: "center",
        overflowX: "auto",
      }}
    >
      <button
        onClick={() => setOutlet("all")}
        style={{
          background: outlet === "all" ? RR.ink : "transparent",
          color: outlet === "all" ? RR.paper : RR.ink,
          border: "none",
          padding: "6px 12px",
          fontFamily: FONT.sans,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 2,
          whiteSpace: "nowrap",
        }}
      >
        All outlets · {total.toLocaleString()}
      </button>
      {OUTLET_KEYS.map((k) => {
        const o = OUTLETS[k];
        const dim = outlet !== "all" && outlet !== k;
        const count = perOutletCount.get(k) || 0;
        return (
          <button
            key={k}
            onClick={() => setOutlet(k)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              flexShrink: 0,
              opacity: dim ? 0.4 : 1,
            }}
          >
            <img
              src={o.logo}
              alt={o.label}
              style={{ height: 14, width: "auto", maxWidth: 56, objectFit: "contain", filter: "grayscale(1)" }}
            />
            <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: "0.06em" }}>{count}</Mono>
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Desktop list row
// ----------------------------------------------------------------------------

function FeedRow({ article, top, latestIso, vol, onOpen, highlight }) {
  const topType = top?.change_type || "other";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "88px 170px 80px 1fr 110px 70px",
        gap: 20,
        padding: "20px 0",
        alignItems: "flex-start",
        borderBottom: `1px solid ${RR.hair}`,
        background: highlight ? `linear-gradient(90deg, ${RR.paper2}, transparent 60%)` : "transparent",
      }}
    >
      <div>
        <Mono style={{ fontSize: 11, color: RR.ink, letterSpacing: "0.06em", display: "block" }}>
          {ageLabel(latestIso || article.first_seen)}
        </Mono>
        <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.14em", marginTop: 2, display: "block" }}>
          RR-{article.id}
        </Mono>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 24 }}>
        <OutletMark outlet={article.outlet} height={22} withName={false} />
      </div>
      <SevPill s={article.max_severity || 0} />
      <div>
        <button
          onClick={onOpen}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: FONT.serif,
            fontSize: 19,
            lineHeight: 1.25,
            color: RR.ink,
            fontWeight: 400,
          }}
        >
          {article.headline}
        </button>
        {top?.summary && (
          <div style={{ marginTop: 6, fontSize: 12, color: RR.ink2, lineHeight: 1.45 }}>
            ↳ {top.summary}
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Mono style={{ fontSize: 9, color: RR.soft, letterSpacing: "0.14em" }}>VOL {vol}</Mono>
          <Mono style={{ fontSize: 9, color: RR.soft, letterSpacing: "0.14em" }}>
            {hoursTracked(article.first_seen)}H TRACKED
          </Mono>
          <button
            onClick={onOpen}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 11,
              color: RR.ink,
              textDecoration: "underline",
              textUnderlineOffset: 2,
              fontFamily: FONT.sans,
            }}
          >
            Open timeline →
          </button>
        </div>
      </div>
      <div>
        <TypeTag type={topType} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 24, color: RR.ink, lineHeight: 1 }}>
          {article.change_count || 0}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Sparkline data={sparkData(article.id, article.change_count)} width={60} height={16} color={RR.ink} />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mobile card
// ----------------------------------------------------------------------------

function FeedCard({ article, top, latestIso, onOpen }) {
  const topType = top?.change_type || "other";
  return (
    <article
      style={{
        padding: "16px 18px 18px",
        borderBottom: `1px solid ${RR.hair}`,
        background: RR.paper,
      }}
      onClick={onOpen}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <OutletMark outlet={article.outlet} height={20} withName={false} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mono style={{ color: RR.soft, fontSize: 10 }}>{ageLabel(latestIso || article.first_seen)}</Mono>
          <SevPill s={article.max_severity || 0} />
        </div>
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: FONT.serif,
          fontWeight: 400,
          fontSize: 19,
          lineHeight: 1.22,
          color: RR.ink,
        }}
      >
        {article.headline}
      </h3>
      {top?.summary && (
        <div
          style={{
            fontFamily: FONT.serif,
            fontStyle: "italic",
            fontSize: 13,
            color: RR.soft,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          ↳ {top.summary}
        </div>
      )}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: RR.soft,
        }}
      >
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <TypeTag type={topType} />
          <span>·</span>
          <span>{article.change_count || 0} EDITS</span>
        </span>
        <Sparkline data={sparkData(article.id, article.change_count)} width={70} height={18} color={RR.ink} />
      </div>
    </article>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function Feed() {
  const navigate = useNavigate();
  const [windowKey, setWindowKey] = useState("24h");
  const [sev, setSev] = useState(2);
  const [types, setTypes] = useState(new Set()); // empty = all
  const [outlet, setOutlet] = useState("all");

  const since = sinceFor(windowKey);
  const singleOutlet = outlet === "all" ? undefined : outlet;
  const typeArr = useMemo(() => Array.from(types), [types]);
  const useTypeFilter = typeArr.length > 0;

  const articlesQuery = usePolling(
    () =>
      fetchArticles({
        minSeverity: sev,
        outlet: singleOutlet,
        since,
        changeTypes: useTypeFilter ? typeArr : undefined,
      }),
    30_000,
    [sev, since, singleOutlet, typeArr.join(",")]
  );

  const recentQuery = usePolling(
    () =>
      fetchRecentChanges({
        minSeverity: 1,
        outlet: singleOutlet,
        since,
        limit: 500,
      }),
    30_000,
    [since, singleOutlet]
  );

  const statsQuery = usePolling(
    () =>
      fetchStats({
        minSeverity: 1,
        outlet: singleOutlet,
        since,
      }),
    30_000,
    [since, singleOutlet]
  );

  const articles = articlesQuery.data || [];
  const recent = recentQuery.data || [];
  const stats = statsQuery.data;

  const grouped = useMemo(() => changesByArticle(recent), [recent]);
  const perOutlet = useMemo(() => {
    const m = new Map();
    for (const a of articles) m.set(a.outlet, (m.get(a.outlet) || 0) + 1);
    return m;
  }, [articles]);

  const sorted = useMemo(() => {
    return [...articles].sort((a, b) => {
      const ai = latestChangeIso(grouped.get(a.id)) || a.first_seen;
      const bi = latestChangeIso(grouped.get(b.id)) || b.first_seen;
      return new Date(bi || 0).getTime() - new Date(ai || 0).getTime();
    });
  }, [articles, grouped]);

  const inView = sorted.length;
  const totalEdits = stats?.edits ?? 0;
  const sev4plus = stats?.vibe_shifts ?? 0;
  const totalAcross = articles.length;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const headerTitle = {
    "24h": "Edits in the last 24 hours.",
    "7d":  "Edits in the last 7 days.",
    "30d": "Edits in the last 30 days.",
    "all": "Every edit, on the record.",
  }[windowKey];

  // ---------------- Desktop ----------------

  const desktop = (
    <div className="hidden md:block">
      <div style={{ padding: "36px 48px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <Kicker>The feed · {dateLabel}</Kicker>
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
              <span style={{ fontStyle: "italic" }}>Edits</span>{" "}
              {headerTitle.replace(/^Edits\s*/, "")}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 36 }}>
            {[
              { v: inView,     l: "IN VIEW" },
              { v: totalEdits, l: "TOTAL EDITS" },
              { v: sev4plus,   l: "SEV 4+", tone: "red" },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: FONT.serif,
                    fontSize: 32,
                    color: s.tone === "red" ? RR.red : RR.ink,
                    lineHeight: 1,
                  }}
                >
                  {Number(s.v || 0).toLocaleString()}
                </div>
                <Kicker style={{ marginTop: 4, fontSize: 9 }}>{s.l}</Kicker>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FilterBar
        window={windowKey}
        setWindow={setWindowKey}
        sev={sev}
        setSev={setSev}
        types={types}
        setTypes={setTypes}
      />

      <OutletTabs
        outlet={outlet}
        setOutlet={setOutlet}
        perOutletCount={perOutlet}
        total={totalAcross}
      />

      <div style={{ padding: "8px 48px 56px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "88px 170px 80px 1fr 110px 70px",
            gap: 20,
            padding: "14px 0",
            borderBottom: `1px solid ${RR.ink}`,
          }}
        >
          {["Time", "Outlet", "Sev", "Headline · diff", "Type", "Edits"].map((h, i) => (
            <Kicker
              key={h}
              style={{
                fontSize: 9,
                textAlign: i === 5 ? "right" : i === 1 ? "center" : "left",
              }}
            >
              {h}
            </Kicker>
          ))}
        </div>
        {articlesQuery.loading && sorted.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: RR.soft }}>
            <Mono>LOADING…</Mono>
          </div>
        )}
        {!articlesQuery.loading && sorted.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: RR.soft, fontFamily: FONT.serif, fontSize: 18 }}>
            No edits in this window.
          </div>
        )}
        {sorted.map((a, i) => {
          const cs = grouped.get(a.id) || [];
          return (
            <FeedRow
              key={a.id}
              article={a}
              top={topChange(cs)}
              latestIso={latestChangeIso(cs)}
              vol={volatility(cs) || (a.change_count || 0) * (a.max_severity || 0)}
              highlight={i === 0}
              onOpen={() => navigate(`/article/${a.id}`)}
            />
          );
        })}
      </div>
    </div>
  );

  // ---------------- Mobile ----------------

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
            Today
          </div>
          <div style={{ fontSize: 11, color: RR.soft, marginTop: 4 }}>
            {totalEdits.toLocaleString()} edits across {OUTLET_KEYS.length} outlets
          </div>
        </div>
        <button
          onClick={() => navigate("/search")}
          style={{
            border: `1px solid ${RR.hair2}`,
            background: "transparent",
            borderRadius: 2,
            padding: "8px 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: RR.ink,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          Search
        </button>
      </div>

      {/* mobile filter chips */}
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 18px",
          overflowX: "auto",
          borderBottom: `1px solid ${RR.hair}`,
          background: RR.paper,
        }}
      >
        {[
          { k: "24h", l: "24h",   apply: () => setWindowKey("24h") },
          { k: "7d",  l: "7d",    apply: () => setWindowKey("7d") },
          { k: "all", l: "All",   apply: () => setWindowKey("all") },
          { k: "sev", l: "Severe",apply: () => setSev(4) },
          { k: "head", l: "Headlines", apply: () => setTypes(new Set(["headline_change"])) },
          { k: "fact", l: "Facts", apply: () => setTypes(new Set(["fact_change"])) },
          { k: "clear", l: "Clear", apply: () => { setWindowKey("24h"); setSev(2); setTypes(new Set()); setOutlet("all"); } },
        ].map((f) => (
          <button
            key={f.k}
            onClick={f.apply}
            style={{
              border: `1px solid ${RR.hair2}`,
              background: "transparent",
              color: RR.ink,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "7px 11px",
              borderRadius: 2,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div>
        {articlesQuery.loading && sorted.length === 0 && (
          <div style={{ padding: "40px 18px", textAlign: "center", color: RR.soft }}>
            <Mono>LOADING…</Mono>
          </div>
        )}
        {!articlesQuery.loading && sorted.length === 0 && (
          <div style={{ padding: "40px 18px", textAlign: "center", color: RR.soft, fontFamily: FONT.serif, fontSize: 18 }}>
            No edits in this window.
          </div>
        )}
        {sorted.map((a) => {
          const cs = grouped.get(a.id) || [];
          return (
            <FeedCard
              key={a.id}
              article={a}
              top={topChange(cs)}
              latestIso={latestChangeIso(cs)}
              onOpen={() => navigate(`/article/${a.id}`)}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
