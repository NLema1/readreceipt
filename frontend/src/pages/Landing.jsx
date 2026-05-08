import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FONT, RR,
  Hair, Kicker, Mono, OutletMark, SevDot, SevPill, TypeTag, Diff, Sparkline,
  OUTLETS, OUTLET_KEYS,
} from "../components/atoms";
import { fetchArticles, fetchArticle, fetchStats, fetchRecentChanges } from "../api";
import { usePolling } from "../usePolling";
import { ageLabel } from "../lib/format";

function Stat({ value, label, tone, size = 36 }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT.serif,
          fontSize: size,
          color: tone === "red" ? RR.red : RR.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <Kicker style={{ marginTop: 6, fontSize: 9 }}>{label}</Kicker>
    </div>
  );
}

function MethodStep({ n, t, d }) {
  return (
    <div style={{ borderTop: `2px solid ${RR.ink}`, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Mono style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em" }}>{n}</Mono>
        <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.18em" }}>STEP</Mono>
      </div>
      <div
        style={{
          fontFamily: FONT.serif,
          fontSize: 26,
          fontStyle: "italic",
          margin: "10px 0 8px",
          color: RR.ink,
        }}
      >
        {t}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: RR.ink2, margin: 0 }}>{d}</p>
    </div>
  );
}

const SEV_LEGEND = [
  { s: 1, l: "Cosmetic",     d: "Whitespace, punctuation, link swap." },
  { s: 2, l: "Copy edit",    d: "Rephrasing or word swap; no meaning shift." },
  { s: 3, l: "Reframe",      d: "Added context, softened tone, shifted emphasis." },
  { s: 4, l: "Fact / quote", d: "A verifiable claim or attribution moved." },
  { s: 5, l: "Correction",   d: "Substantive correction, retraction, reversal." },
];

const METHOD = [
  { n: "01", t: "Snapshot", d: "A scheduler polls each outlet's RSS feed every 5 minutes. New articles enter a 7-day tracking window, captured every 30 minutes for the first day." },
  { n: "02", t: "Diff",     d: "Successive versions are compared at the word level. Whitespace, tracking pixels, and ad-tag noise are filtered before classification." },
  { n: "03", t: "Classify", d: "Claude Haiku 4.5 reads both versions in context and answers a single question: would a careful reader come away with a different conclusion?" },
  { n: "04", t: "Receipt",  d: "Severity 1–5 with one-sentence rationale. Receipts stay public, searchable, and citable forever." },
];

export default function Landing() {
  const navigate = useNavigate();

  // Pull a small set of articles + recent changes to power the strip + spotlight.
  const articlesQuery = usePolling(
    () => fetchArticles({ minSeverity: 3, since: new Date(Date.now() - 7 * 86400e3).toISOString() }),
    60_000, []
  );
  const statsQuery = usePolling(
    () => fetchStats({ minSeverity: 1, since: new Date(Date.now() - 86400e3).toISOString() }),
    60_000, []
  );
  const allTimeStatsQuery = usePolling(
    () => fetchStats({ minSeverity: 0, since: "all" }),
    300_000, []
  );
  const recentQuery = usePolling(
    () => fetchRecentChanges({ minSeverity: 1, since: new Date(Date.now() - 86400e3).toISOString(), limit: 500 }),
    60_000, []
  );

  const articles = articlesQuery.data || [];
  const stats24 = statsQuery.data;
  const statsAll = allTimeStatsQuery.data;
  const recent = recentQuery.data || [];

  // Spotlight = highest-volatility article in the last 7d
  const spotlightStub = useMemo(() => {
    if (!articles.length) return null;
    const score = (a) => (a.change_count || 0) * (a.max_severity || 0);
    return [...articles].sort((a, b) => score(b) - score(a))[0];
  }, [articles]);

  const spotlightQuery = usePolling(
    () => (spotlightStub ? fetchArticle(spotlightStub.id) : Promise.resolve(null)),
    120_000, [spotlightStub?.id]
  );
  const spotlight = spotlightQuery.data;

  // Reduce 24h sparkline data from changes
  const sparkData24h = useMemo(() => {
    const buckets = new Array(24).fill(0);
    const cutoff = Date.now() - 86400e3;
    for (const c of recent) {
      const t = new Date(c.classified_at).getTime();
      if (t < cutoff) continue;
      const hr = Math.floor((Date.now() - t) / 3_600_000);
      const idx = 23 - Math.min(23, Math.max(0, hr));
      buckets[idx] += c.severity || 1;
    }
    return buckets;
  }, [recent]);

  const top4 = useMemo(() => {
    const sorted = [...articles].sort((a, b) => {
      // most recent first based on first_seen
      return new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime();
    });
    return sorted.slice(0, 4);
  }, [articles]);

  const totalArticles = (statsAll?.articles ?? 0).toLocaleString();
  const totalEdits24h = (stats24?.edits ?? 0).toLocaleString();
  const sigToday = stats24?.vibe_shifts ?? 0;
  const outletsCount = OUTLET_KEYS.length;

  // -------- Spotlight diff (prefer real version pair if available) --------
  function spotlightDiff() {
    if (!spotlight) return null;
    const versions = spotlight.versions || [];
    let oldText = "";
    let newText = spotlight.headline || "";
    if (versions.length >= 2) {
      const last = versions[versions.length - 1];
      // find the most recent prior headline that differs
      for (let i = versions.length - 2; i >= 0; i--) {
        if ((versions[i].headline || "") !== (last.headline || "")) {
          oldText = versions[i].headline || "";
          newText = last.headline || "";
          break;
        }
      }
      if (!oldText) {
        oldText = versions[0].headline || "";
        newText = last.headline || newText;
      }
    } else if (versions.length === 1) {
      oldText = versions[0].headline || "";
      newText = spotlight.headline || oldText;
    } else {
      oldText = spotlight.headline || "";
    }
    const topChange = (spotlight.changes || [])[0];
    return {
      oldText,
      newText,
      topChange,
      versionCount: versions.length,
      changeCount: (spotlight.changes || []).length,
      maxSev: (spotlight.changes || []).reduce((m, c) => Math.max(m, c.severity || 0), 0) || 4,
      volatility: (spotlight.changes || []).reduce((s, c) => s + (c.severity || 0), 0),
      classifiedAtTime: topChange?.classified_at
        ? new Date(topChange.classified_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
        : null,
    };
  }

  const sd = spotlightDiff();

  // -----------------------------------------------------------
  // DESKTOP
  // -----------------------------------------------------------
  const desktop = (
    <div className="hidden md:block">
      {/* HERO */}
      <div
        style={{
          padding: "72px 56px 56px",
          display: "grid",
          gridTemplateColumns: "1.25fr 1fr",
          gap: 64,
          alignItems: "start",
        }}
      >
        <div>
          <Kicker>Editorial accountability · since 2026</Kicker>
          <h1
            style={{
              fontFamily: FONT.serif,
              fontSize: 84,
              lineHeight: 0.96,
              margin: "20px 0 24px",
              letterSpacing: "-0.015em",
              fontWeight: 400,
              color: RR.ink,
            }}
          >
            Every quiet edit<br />
            to the news,<br />
            <span style={{ fontStyle: "italic" }}>on the record.</span>
          </h1>
          <p
            style={{
              fontFamily: FONT.serif,
              fontSize: 22,
              lineHeight: 1.42,
              color: RR.ink2,
              maxWidth: 560,
              margin: 0,
            }}
          >
            We watch eleven major outlets, snapshot every article, and flag the moments
            a headline shifts, a fact moves, or a source quietly disappears.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button
              onClick={() => navigate("/feed")}
              style={{
                background: RR.ink,
                color: RR.paper,
                border: "none",
                padding: "14px 22px",
                fontFamily: FONT.sans,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              See today's tape →
            </button>
            <button
              onClick={() => navigate("/search")}
              style={{
                background: "transparent",
                color: RR.ink,
                border: `1px solid ${RR.ink}`,
                padding: "14px 22px",
                fontFamily: FONT.sans,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              Paste a URL
            </button>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 48 }}>
            <Stat value={String(outletsCount)} label="OUTLETS TRACKED" />
            <Stat value={totalArticles} label="ARTICLES IN INDEX" />
            <Stat value={totalEdits24h} label="EDITS · LAST 24H" />
            <Stat value={String(sigToday)} label="SIGNIFICANT TODAY" tone="red" />
          </div>
        </div>

        {/* SAMPLE RECEIPT */}
        <div style={{ position: "relative", paddingTop: 12 }}>
          <div
            onClick={() => spotlight && navigate(`/article/${spotlight.id}`)}
            style={{
              background: RR.card,
              border: `1px solid ${RR.hair2}`,
              padding: "24px 26px 20px",
              position: "relative",
              boxShadow: "0 30px 60px -30px rgba(20,17,13,0.25), 0 4px 16px -8px rgba(20,17,13,0.10)",
              transform: "rotate(0.6deg)",
              cursor: spotlight ? "pointer" : "default",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <OutletMark outlet={spotlight?.outlet || "guardian"} height={13} />
              <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: "0.12em" }}>
                RR-{spotlight?.id ?? "—"} · {sd?.classifiedAtTime || ""}
              </Mono>
            </div>
            <Hair />
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 10px" }}>
              <SevPill s={sd?.maxSev || 4} />
              <TypeTag type={sd?.topChange?.change_type || "headline_change"} />
              <span style={{ flex: 1 }} />
              <Mono style={{ color: RR.soft, fontSize: 10 }}>
                {sd?.versionCount ? `v${sd.versionCount} of ${sd.versionCount}` : ""}
              </Mono>
            </div>
            {sd ? (
              <Diff oldText={sd.oldText} newText={sd.newText} />
            ) : (
              <div style={{ fontFamily: FONT.serif, fontSize: 18, color: RR.soft, lineHeight: 1.3 }}>
                Loading the latest receipt…
              </div>
            )}
            {sd?.topChange?.summary && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  background: RR.paper2,
                  fontFamily: FONT.serif,
                  fontStyle: "italic",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: RR.ink2,
                  borderLeft: `2px solid ${RR.red}`,
                }}
              >
                "{sd.topChange.summary}"
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: RR.mute,
                    marginTop: 8,
                    fontStyle: "normal",
                  }}
                >
                  — CLASSIFIED · CLAUDE HAIKU 4.5
                </div>
              </div>
            )}
            <Hair style={{ marginTop: 18 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.14em" }}>
                {sd?.changeCount || 0} EDITS LOGGED
              </Mono>
              <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.14em" }}>
                VOL · {sd?.volatility || 0}
              </Mono>
            </div>
          </div>
        </div>
      </div>

      {/* OUTLET MARQUEE */}
      <div
        style={{
          padding: "22px 56px 26px",
          borderTop: `1px solid ${RR.hair}`,
          borderBottom: `1px solid ${RR.hair}`,
          background: RR.paper2,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <Kicker>Currently watching · {OUTLET_KEYS.length} outlets</Kicker>
          <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.16em" }}>
            POLLED EVERY 5 MIN
          </Mono>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${OUTLET_KEYS.length}, 1fr)`,
            alignItems: "center",
            gap: 24,
          }}
        >
          {OUTLET_KEYS.map((k) => (
            <div key={k} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 24 }}>
              <img
                src={OUTLETS[k].logo}
                alt={OUTLETS[k].label}
                style={{
                  maxHeight: 20,
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  filter: "grayscale(1) contrast(1.05) opacity(0.75)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: "72px 56px 56px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <Kicker>The method</Kicker>
            <h2
              style={{
                fontFamily: FONT.serif,
                fontSize: 48,
                lineHeight: 1,
                margin: "12px 0 0",
                letterSpacing: "-0.01em",
                fontWeight: 400,
              }}
            >
              How a single edit becomes <span style={{ fontStyle: "italic" }}>a receipt.</span>
            </h2>
          </div>
          <Mono style={{ color: RR.soft, fontSize: 11, letterSpacing: "0.16em" }}>
            5-MINUTE POLL · 7-DAY WINDOW
          </Mono>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {METHOD.map((s) => <MethodStep key={s.n} {...s} />)}
        </div>
      </div>

      {/* SEVERITY LEGEND */}
      <div style={{ padding: "8px 56px 56px" }}>
        <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <Kicker>The severity scale</Kicker>
            <Mono style={{ color: RR.soft, fontSize: 11 }}>5 levels · meaning-preservation test</Mono>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
            {SEV_LEGEND.map((x, i) => (
              <div key={x.s} style={{ padding: "4px 16px", borderLeft: i ? `1px solid ${RR.hair}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <SevDot s={x.s} size={8} />
                  <SevPill s={x.s} />
                </div>
                <div
                  style={{
                    fontFamily: FONT.serif,
                    fontStyle: "italic",
                    fontSize: 18,
                    color: RR.ink,
                    marginBottom: 4,
                  }}
                >
                  {x.l}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.4, color: RR.ink2 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ON THE TAPE STRIP */}
      <div style={{ padding: "0 56px 56px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h3
            style={{
              fontFamily: FONT.serif,
              fontSize: 32,
              margin: 0,
              fontWeight: 400,
              letterSpacing: "-0.005em",
            }}
          >
            <span style={{ fontStyle: "italic" }}>On the tape</span> right now
          </h3>
          <Link to="/feed" style={{ fontSize: 13, color: RR.ink2, textDecoration: "underline", textUnderlineOffset: 4 }}>
            Open the full feed →
          </Link>
        </div>
        <div style={{ borderTop: `1px solid ${RR.ink}` }}>
          {top4.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: RR.soft, fontFamily: FONT.serif, fontSize: 18 }}>
              Loading the tape…
            </div>
          )}
          {top4.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/article/${a.id}`)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                display: "grid",
                gridTemplateColumns: "110px 110px 1fr 90px 60px",
                gap: 24,
                alignItems: "center",
                padding: "18px 0",
                borderBottom: `1px solid ${RR.hair}`,
              }}
            >
              <Mono style={{ color: RR.soft, fontSize: 11, letterSpacing: "0.1em" }}>
                {ageLabel(a.first_seen)}
              </Mono>
              <OutletMark outlet={a.outlet} height={12} mono />
              <div>
                <div style={{ fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.25, color: RR.ink }}>
                  {a.headline}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: RR.soft }}>
                  ↳ {a.change_count || 0} edits tracked
                </div>
              </div>
              <TypeTag type="headline_change" />
              <div style={{ textAlign: "right" }}><SevPill s={a.max_severity || 0} /></div>
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding: "40px 56px 28px", borderTop: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontFamily: FONT.serif, fontSize: 28, fontStyle: "italic" }}>Readreceipt</div>
            <div style={{ fontSize: 12, color: RR.soft, marginTop: 4 }}>
              An open ledger of editorial change. Open data, open API.
            </div>
          </div>
          <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: "0.16em" }}>
            POLLED EVERY 5 MIN · CLASSIFIED BY CLAUDE HAIKU 4.5
          </Mono>
        </div>
      </div>
    </div>
  );

  // -----------------------------------------------------------
  // MOBILE
  // -----------------------------------------------------------
  const mobile = (
    <div className="md:hidden">
      <div
        style={{
          padding: "14px 18px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: RR.soft,
          textTransform: "uppercase",
        }}
      >
        <span>Readreceipt</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: RR.red }} />
          Live · {totalEdits24h} today
        </span>
      </div>

      <div style={{ padding: "22px 18px 24px" }}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: "0.22em",
            color: RR.soft,
            textTransform: "uppercase",
          }}
        >
          Quiet edits, on the record
        </div>
        <h1
          style={{
            margin: "10px 0 0",
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 46,
            lineHeight: 0.98,
            color: RR.ink,
            letterSpacing: "-0.01em",
          }}
        >
          Every change<br />
          <span style={{ fontStyle: "italic", color: RR.redDeep }}>they didn't</span><br />
          announce.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontFamily: FONT.serif,
            fontSize: 18,
            lineHeight: 1.35,
            color: RR.ink2,
          }}
        >
          We watch eleven major outlets and post a receipt every time they
          rewrite a headline, soften a quote, or quietly drop a source.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            onClick={() => navigate("/feed")}
            style={{
              flex: 1,
              padding: "13px 0",
              border: "none",
              background: RR.ink,
              color: RR.paper,
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            See today's edits →
          </button>
          <button
            onClick={() => navigate("/search")}
            style={{
              padding: "13px 14px",
              border: `1px solid ${RR.ink}`,
              background: "transparent",
              color: RR.ink,
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            How
          </button>
        </div>
      </div>

      {/* live ticker */}
      <div style={{ borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Kicker>Last 24 hours</Kicker>
          <Mono style={{ color: RR.soft }}>{totalEdits24h} edits</Mono>
        </div>
        <div style={{ padding: "0 18px 12px" }}>
          <Sparkline data={sparkData24h} width={339} height={42} color={RR.red} fill={RR.red} />
        </div>
      </div>

      {/* sample receipt */}
      <div style={{ padding: "24px 18px 8px" }}>
        <Kicker style={{ marginBottom: 10 }}>Sample receipt</Kicker>
        <div
          onClick={() => spotlight && navigate(`/article/${spotlight.id}`)}
          style={{
            background: RR.card,
            border: `1px solid ${RR.hair2}`,
            borderRadius: 2,
            padding: "18px 18px 16px",
            boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 12px 24px -16px rgba(20,17,13,0.18)",
            cursor: spotlight ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <OutletMark outlet={spotlight?.outlet || "guardian"} height={14} />
            <SevPill s={sd?.maxSev || 4} />
          </div>
          <Hair style={{ margin: "10px 0" }} dashed />
          {sd ? (
            <Diff oldText={sd.oldText} newText={sd.newText} />
          ) : (
            <div style={{ fontFamily: FONT.serif, fontSize: 16, color: RR.soft }}>Loading…</div>
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 12,
              fontFamily: FONT.mono,
              fontSize: 10,
              color: RR.soft,
              letterSpacing: "0.08em",
            }}
          >
            <span>{sd?.classifiedAtTime || ""}</span>
            <span>·</span>
            <TypeTag type={sd?.topChange?.change_type || "headline_change"} />
            <span>·</span>
            <span>{sd?.versionCount ? `v${sd.versionCount}` : ""}</span>
          </div>
        </div>
      </div>

      {/* outlets grid */}
      <div style={{ padding: "24px 18px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Kicker>Watching · {outletsCount} outlets</Kicker>
          <Mono style={{ color: RR.soft }}>{totalEdits24h} today</Mono>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 1,
            background: RR.hair,
            marginTop: 12,
            border: `1px solid ${RR.hair}`,
          }}
        >
          {OUTLET_KEYS.map((k) => (
            <div
              key={k}
              style={{
                background: RR.paper,
                padding: "14px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 56,
              }}
            >
              <img
                src={OUTLETS[k].logo}
                alt={OUTLETS[k].label}
                style={{ maxHeight: 18, maxWidth: "85%", objectFit: "contain", filter: "grayscale(1)" }}
              />
            </div>
          ))}
          {/* 12th cell to keep the 4-col grid square — hairline only */}
          <div style={{ background: RR.paper2, height: 56 }} />
        </div>
      </div>

      {/* how it works */}
      <div style={{ padding: "28px 18px 32px" }}>
        <Kicker>How it works</Kicker>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { n: "01", t: "We pull RSS", d: "Eleven feeds, every 5 minutes." },
            { n: "02", t: "We diff",      d: "Headlines, body, sources, quotes." },
            { n: "03", t: "We classify",  d: "Severity 1–5; nine edit types." },
            { n: "04", t: "You read",     d: "Receipts on the record, forever." },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  fontFamily: FONT.serif,
                  fontStyle: "italic",
                  fontSize: 32,
                  color: RR.redDeep,
                  lineHeight: 1,
                  width: 36,
                }}
              >
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
    </div>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
