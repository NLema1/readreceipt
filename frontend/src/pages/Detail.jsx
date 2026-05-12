import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FONT, RR,
  Hair, Kicker, Mono, OutletMark, SevDot, SevPill, TypeTag, Diff, Sparkline,
  CHANGE_TYPES, typeOf,
} from "../components/atoms";
import { fetchArticle } from "../api";
import { usePolling } from "../usePolling";
import { ageLabel, hostFromUrl, timeOfDay, wordDiff } from "../lib/format";
import ErrorBanner from "../components/ErrorBanner";
import { ARTICLE_ID_PREFIX } from "../constants";

function StatCell({ value, label, tone, last }) {
  return (
    <div style={{ padding: "16px 18px", borderRight: last ? "none" : `1px solid ${RR.hair}` }}>
      <div
        style={{
          fontFamily: FONT.serif,
          fontSize: 30,
          lineHeight: 1,
          color: tone === "red" ? RR.red : RR.ink,
        }}
      >
        {value}
      </div>
      <Kicker style={{ marginTop: 6, fontSize: 9 }}>{label}</Kicker>
    </div>
  );
}

function TimelineEvent({ change, version, prevHeadline, currentHeadline }) {
  const tdef = typeOf(change.change_type);
  const isHeadline = change.change_type === "headline_change";
  const accent = change.severity >= 4 ? RR.red : change.severity >= 3 ? RR.amber : RR.hair2;
  const dotInner = change.severity >= 5 ? RR.redDeep : change.severity >= 4 ? RR.red : change.severity >= 3 ? RR.amber : RR.mute;
  const big = change.severity >= 4;
  return (
    <div style={{ position: "relative", paddingBottom: 22 }}>
      <div
        style={{
          position: "absolute",
          left: -27,
          top: 6,
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${accent}`,
          background: RR.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            width: change.severity >= 4 ? 10 : change.severity >= 3 ? 8 : 5,
            height: change.severity >= 4 ? 10 : change.severity >= 3 ? 8 : 5,
            borderRadius: "50%",
            background: dotInner,
          }}
        />
      </div>
      <div
        style={{
          background: big ? RR.card : "transparent",
          border: big ? `1px solid ${RR.hair2}` : "none",
          padding: big ? "14px 18px" : "0 0 0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: "0.14em" }}>
            {timeOfDay(change.classified_at)} · {ageLabel(change.classified_at)}
          </Mono>
          <SevPill s={change.severity} />
          <TypeTag type={change.change_type} />
          <span style={{ flex: 1 }} />
          {version != null && <Mono style={{ fontSize: 10, color: RR.mute }}>v{version}</Mono>}
        </div>
        <div
          style={{
            fontFamily: FONT.serif,
            fontSize: big ? 18 : 15,
            fontStyle: "italic",
            color: RR.ink,
            lineHeight: 1.35,
            marginBottom: change.severity >= 3 ? 8 : 0,
          }}
        >
          {change.summary}
        </div>
        {isHeadline && prevHeadline && currentHeadline && prevHeadline !== currentHeadline && (
          <Diff oldText={`"${prevHeadline}"`} newText={`"${currentHeadline}"`} />
        )}
      </div>
    </div>
  );
}

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const articleId = Number(id);

  const articleQuery = usePolling(
    () => (Number.isFinite(articleId) ? fetchArticle(articleId) : Promise.resolve(null)),
    60_000, [articleId]
  );

  const article = articleQuery.data;

  const [tab, setTab] = useState("Timeline");

  // Build version-id -> headline map and version-id -> ordinal map
  const { versionHeadline, versionIndex, sortedVersions, currentHeadlineFromVersions } = useMemo(() => {
    const versions = article?.versions || [];
    const sorted = [...versions].sort(
      (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime()
    );
    const head = new Map();
    const idx = new Map();
    sorted.forEach((v, i) => {
      head.set(v.id, v.headline);
      idx.set(v.id, i + 1);
    });
    return {
      versionHeadline: head,
      versionIndex: idx,
      sortedVersions: sorted,
      currentHeadlineFromVersions: sorted[sorted.length - 1]?.headline || article?.headline || "",
    };
  }, [article]);

  const changes = article?.changes || [];

  const stats = useMemo(() => {
    const total = changes.length;
    const versionCount = sortedVersions.length || 1;
    const volatility = changes.reduce((s, c) => s + (c.severity || 0), 0);
    const maxSev = changes.reduce((m, c) => Math.max(m, c.severity || 0), 0);
    const composition = new Map();
    for (const c of changes) {
      composition.set(c.change_type, (composition.get(c.change_type) || 0) + 1);
    }
    return { total, versionCount, volatility, maxSev, composition };
  }, [changes, sortedVersions]);

  const trackingUntil = article?.tracking_until
    ? new Date(article.tracking_until).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";

  // Volatility cumulative series for sparkline (oldest → newest)
  const volSeries = useMemo(() => {
    const ordered = [...changes].sort(
      (a, b) => new Date(a.classified_at).getTime() - new Date(b.classified_at).getTime()
    );
    const series = [];
    let acc = 0;
    for (const c of ordered) { acc += c.severity || 0; series.push(acc); }
    return series.length ? series : [0];
  }, [changes]);

  // ----- Headline diff (latest meaningful headline change pair) -----
  const headlineDiff = useMemo(() => {
    let oldH = "";
    let newH = currentHeadlineFromVersions;
    for (let i = sortedVersions.length - 1; i >= 1; i--) {
      const cur = sortedVersions[i].headline || "";
      const prev = sortedVersions[i - 1].headline || "";
      if (cur !== prev) { oldH = prev; newH = cur; break; }
    }
    return { oldH, newH, tokens: oldH ? wordDiff(oldH, newH) : null };
  }, [sortedVersions, currentHeadlineFromVersions]);

  // ----- Render -----

  if (articleQuery.loading && !article) {
    return (
      <div style={{ padding: "72px 48px" }}>
        <Mono style={{ color: RR.soft }}>LOADING ARTICLE…</Mono>
      </div>
    );
  }
  if (!article) {
    return (
      <div style={{ padding: "72px 48px" }}>
        <Kicker>Not found</Kicker>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 48, marginTop: 12, fontWeight: 400 }}>
          We don't have a receipt for that article.
        </h1>
        <button
          onClick={() => navigate("/feed")}
          style={{
            marginTop: 24,
            background: RR.ink,
            color: RR.paper,
            border: "none",
            padding: "12px 18px",
            fontFamily: FONT.sans,
            fontSize: 13,
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          ← Back to feed
        </button>
      </div>
    );
  }

  const headlineForRow = (c) => {
    const cur = versionHeadline.get(c.to_version_id);
    const prev = versionHeadline.get(c.from_version_id);
    return { cur: cur || "", prev: prev || "" };
  };

  // ---------- DESKTOP ----------
  const desktop = (
    <div className="hidden md:block">
      {/* breadcrumb strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 48px",
          borderBottom: `1px solid ${RR.hair}`,
        }}
      >
        <button
          onClick={() => navigate("/feed")}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT.sans,
            fontSize: 12,
            color: RR.soft,
            padding: 0,
          }}
        >
          ← Back to feed
        </button>
        <Mono style={{ color: RR.mute, fontSize: 10, letterSpacing: "0.16em" }}>
          {ARTICLE_ID_PREFIX}{article.id} · TRACKED {Math.max(1, Math.round((Date.now() - new Date(article.first_seen).getTime()) / 3_600_000))}H · LIVE
        </Mono>
      </div>

      {/* MASTHEAD */}
      <div style={{ padding: "40px 48px 28px", borderBottom: `1px solid ${RR.hair}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <OutletMark outlet={article.outlet} height={16} />
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: RR.mute }} />
          <Mono style={{ color: RR.soft, fontSize: 11 }}>
            First seen {timeOfDay(article.first_seen)} · {stats.versionCount} versions · {stats.total} edits
          </Mono>
        </div>
        <h1
          style={{
            fontFamily: FONT.serif,
            fontSize: 52,
            lineHeight: 1.05,
            margin: "0 0 12px",
            fontWeight: 400,
            letterSpacing: "-0.012em",
          }}
        >
          {currentHeadlineFromVersions}
        </h1>
        {headlineDiff.oldH && (
          <div
            style={{
              fontFamily: FONT.serif,
              fontSize: 19,
              lineHeight: 1.4,
              color: RR.soft,
              fontStyle: "italic",
              maxWidth: 880,
            }}
          >
            ↳ originally:{" "}
            <span
              style={{
                textDecoration: "line-through",
                textDecorationColor: RR.red,
                textDecorationThickness: 1,
              }}
            >
              {headlineDiff.oldH}
            </span>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 0,
            marginTop: 28,
            borderTop: `1px solid ${RR.ink}`,
          }}
        >
          <StatCell value={String(stats.versionCount)} label="VERSIONS" />
          <StatCell value={String(stats.total)} label="EDITS LOGGED" />
          <StatCell value={String(stats.volatility)} label="VOLATILITY" tone="red" />
          <StatCell value={`S·${stats.maxSev || 0}`} label="MAX SEVERITY" tone="red" />
          <StatCell value={trackingUntil} label="TRACKING UNTIL" last />
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding: "0 48px", borderBottom: `1px solid ${RR.hair}`, display: "flex", gap: 28 }}>
        {["Timeline", "Diff viewer", "All versions", "Sources"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "transparent",
              border: "none",
              padding: "14px 0",
              cursor: "pointer",
              fontFamily: FONT.sans,
              fontSize: 13,
              fontWeight: tab === t ? 600 : 500,
              color: tab === t ? RR.ink : RR.soft,
              borderBottom: tab === t ? `2px solid ${RR.ink}` : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div style={{ padding: "32px 48px 48px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 40 }}>
        {/* Tab content */}
        <div>
          {tab === "Timeline" && (
            <>
              <Kicker style={{ marginBottom: 16 }}>
                Revision log · {stats.total} edits across {stats.versionCount} versions
              </Kicker>
              <div style={{ position: "relative", paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 1, background: RR.hair2 }} />
                {changes.length === 0 && (
                  <div style={{ color: RR.soft, fontFamily: FONT.serif, fontSize: 16 }}>
                    No edits classified yet on this article.
                  </div>
                )}
                {changes.map((c) => {
                  const { cur, prev } = headlineForRow(c);
                  return (
                    <TimelineEvent
                      key={c.id}
                      change={c}
                      version={versionIndex.get(c.to_version_id)}
                      prevHeadline={prev}
                      currentHeadline={cur}
                    />
                  );
                })}
              </div>
            </>
          )}

          {tab === "Diff viewer" && (
            <DiffViewer versions={sortedVersions} />
          )}

          {tab === "All versions" && (
            <AllVersions versions={sortedVersions} />
          )}

          {tab === "Sources" && (
            <Sources url={article.url} outlet={article.outlet} />
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "18px 20px" }}>
            <Kicker style={{ marginBottom: 12 }}>Volatility · running total</Kicker>
            <div style={{ fontFamily: FONT.serif, fontSize: 44, lineHeight: 1, color: RR.red }}>
              {stats.volatility}
            </div>
            <Sparkline data={volSeries} width={310} height={50} color={RR.red} fill={RR.red} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.14em" }}>
                {timeOfDay(article.first_seen)}
              </Mono>
              <Mono style={{ fontSize: 9, color: RR.mute, letterSpacing: "0.14em" }}>
                NOW · {timeOfDay(new Date().toISOString())}
              </Mono>
            </div>
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "18px 20px" }}>
            <Kicker style={{ marginBottom: 12 }}>Edit composition</Kicker>
            {Array.from(stats.composition.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => {
                const t = typeOf(k);
                const max = Math.max(...stats.composition.values(), 1);
                return (
                  <div
                    key={k}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 24px",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Mono style={{ fontSize: 10, color: RR.ink, letterSpacing: "0.1em" }}>
                      {t.short}
                    </Mono>
                    <div style={{ height: 6, background: RR.paper2, position: "relative" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${(n / max) * 100}%`, background: t.hue }} />
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
                      {n}
                    </span>
                  </div>
                );
              })}
            {stats.composition.size === 0 && (
              <Mono style={{ color: RR.soft }}>No classified edits.</Mono>
            )}
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "18px 20px" }}>
            <Kicker style={{ marginBottom: 12 }}>Source</Kicker>
            <div
              style={{
                fontSize: 12,
                color: RR.ink2,
                wordBreak: "break-all",
                fontFamily: FONT.mono,
                lineHeight: 1.5,
              }}
            >
              {hostFromUrl(article.url)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: RR.ink,
                  color: RR.paper,
                  border: "none",
                  padding: "8px 12px",
                  fontFamily: FONT.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  borderRadius: 2,
                  textDecoration: "none",
                }}
              >
                Open original ↗
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/article/${article.id}`;
                  navigator.clipboard?.writeText(url);
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: RR.ink,
                  border: `1px solid ${RR.ink}`,
                  padding: "8px 12px",
                  fontFamily: FONT.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  borderRadius: 2,
                }}
              >
                Copy link
              </button>
            </div>
          </div>

          <div style={{ background: RR.card, border: `1px solid ${RR.hair2}`, padding: "18px 20px" }}>
            <Kicker style={{ marginBottom: 12 }}>Versions</Kicker>
            {sortedVersions.length === 0 && <Mono style={{ color: RR.soft }}>None yet.</Mono>}
            {sortedVersions
              .slice()
              .reverse()
              .map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < sortedVersions.length - 1 ? `1px solid ${RR.hair}` : "none",
                  }}
                >
                  <Mono style={{ fontSize: 10, color: RR.ink, fontWeight: 600, width: 24 }}>
                    v{versionIndex.get(v.id)}
                  </Mono>
                  <Mono style={{ fontSize: 10, color: RR.soft, width: 56 }}>{timeOfDay(v.scraped_at)}</Mono>
                  <span
                    style={{
                      fontSize: 11,
                      color: RR.ink2,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.headline}
                  </span>
                  {i === 0 && (
                    <Mono style={{ fontSize: 9, color: RR.green, letterSpacing: "0.14em" }}>LIVE</Mono>
                  )}
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
          padding: "14px 18px 18px",
          borderBottom: `1px solid ${RR.hair}`,
          background: RR.paper,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              border: "none",
              background: "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: RR.ink,
              textTransform: "uppercase",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16 }}>←</span> Back
          </button>
          <Mono style={{ color: RR.soft }}>#{article.id}</Mono>
        </div>
        <OutletMark outlet={article.outlet} height={14} />
        <h1
          style={{
            margin: "12px 0 8px",
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 26,
            lineHeight: 1.12,
            color: RR.ink,
          }}
        >
          {currentHeadlineFromVersions}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SevPill s={stats.maxSev} />
          <Mono style={{ color: RR.soft }}>
            {stats.total} edits · {stats.versionCount} versions
          </Mono>
        </div>
      </div>

      {/* sparkline summary */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Kicker>Volatility · running</Kicker>
          <Mono style={{ color: RR.soft }}>vol {stats.volatility}</Mono>
        </div>
        <Sparkline data={volSeries} width={339} height={36} color={RR.red} fill={RR.red} />
      </div>

      {/* latest headline diff card */}
      {headlineDiff.oldH && (
        <div style={{ padding: "20px 18px 10px" }}>
          <Kicker style={{ marginBottom: 8 }}>Latest headline change</Kicker>
          <div
            style={{
              background: RR.card,
              border: `1px solid ${RR.hair2}`,
              borderRadius: 2,
              padding: "16px 16px 14px",
            }}
          >
            <Diff oldText={headlineDiff.oldH} newText={headlineDiff.newH} size={16} />
          </div>
        </div>
      )}

      {/* timeline */}
      <div style={{ padding: "20px 18px 24px" }}>
        <Kicker style={{ marginBottom: 14 }}>Full timeline · {stats.total} changes</Kicker>
        <div style={{ position: "relative", paddingLeft: 26 }}>
          <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 1, background: RR.hair2 }} />
          {changes.length === 0 && (
            <Mono style={{ color: RR.soft }}>No edits classified yet.</Mono>
          )}
          {changes.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 14, paddingBottom: 18, position: "relative", marginLeft: -19 }}>
              <div
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  marginTop: 4,
                  background: RR.paper,
                  border: `1.5px solid ${typeOf(c.change_type).hue}`,
                  position: "relative",
                  zIndex: 1,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Mono style={{ color: RR.ink, fontWeight: 600 }}>{timeOfDay(c.classified_at)}</Mono>
                  <TypeTag type={c.change_type} />
                  <SevDot s={c.severity} />
                </div>
                <div style={{ fontFamily: FONT.serif, fontSize: 15, lineHeight: 1.35, color: RR.ink }}>
                  {c.summary}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ErrorBanner queries={[articleQuery]} />
      {desktop}
      {mobile}
    </>
  );
}

// ---------- Sub-tabs (desktop) ----------

function DiffViewer({ versions }) {
  const pairs = useMemo(() => {
    const out = [];
    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1].headline || "";
      const cur = versions[i].headline || "";
      if (prev === cur) continue;
      out.push({
        from: i,
        to: i + 1,
        prev,
        cur,
        at: versions[i].scraped_at,
        tokens: wordDiff(prev, cur),
      });
    }
    return out;
  }, [versions]);
  return (
    <div>
      <Kicker style={{ marginBottom: 16 }}>Headline diffs · {pairs.length} version pairs</Kicker>
      {pairs.length === 0 && (
        <Mono style={{ color: RR.soft }}>The headline has not changed yet.</Mono>
      )}
      {pairs.map((p) => (
        <div
          key={p.to}
          style={{
            background: RR.card,
            border: `1px solid ${RR.hair2}`,
            padding: "18px 20px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <Mono style={{ color: RR.soft }}>v{p.from} → v{p.to}</Mono>
            <Mono style={{ color: RR.mute }}>{timeOfDay(p.at)}</Mono>
          </div>
          <div style={{ fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.35 }}>
            {p.tokens.map((t, i) => {
              if (t.kind === "same") return <span key={i}>{t.token}</span>;
              if (t.kind === "del")
                return (
                  <span
                    key={i}
                    style={{
                      color: RR.soft,
                      textDecoration: "line-through",
                      textDecorationColor: RR.red,
                      textDecorationThickness: 1.5,
                    }}
                  >
                    {t.token}
                  </span>
                );
              return (
                <span
                  key={i}
                  style={{ borderBottom: `2px solid ${RR.green}`, paddingBottom: 1 }}
                >
                  {t.token}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AllVersions({ versions }) {
  return (
    <div>
      <Kicker style={{ marginBottom: 16 }}>All versions · {versions.length}</Kicker>
      {versions.length === 0 && <Mono style={{ color: RR.soft }}>No versions captured yet.</Mono>}
      {versions.map((v, i) => (
        <div
          key={v.id}
          style={{
            padding: "16px 0",
            borderBottom: `1px solid ${RR.hair}`,
            display: "grid",
            gridTemplateColumns: "60px 90px 1fr",
            gap: 16,
            alignItems: "baseline",
          }}
        >
          <Mono style={{ fontSize: 11, fontWeight: 700, color: RR.ink }}>v{i + 1}</Mono>
          <Mono style={{ fontSize: 11, color: RR.soft }}>{timeOfDay(v.scraped_at)}</Mono>
          <div style={{ fontFamily: FONT.serif, fontSize: 17, lineHeight: 1.35, color: RR.ink }}>
            {v.headline}
          </div>
        </div>
      ))}
    </div>
  );
}

function Sources({ url, outlet }) {
  return (
    <div>
      <Kicker style={{ marginBottom: 16 }}>Source</Kicker>
      <div
        style={{
          background: RR.card,
          border: `1px solid ${RR.hair2}`,
          padding: "20px 24px",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <OutletMark outlet={outlet} height={14} />
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 13,
            color: RR.ink2,
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {url}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 16,
            background: RR.ink,
            color: RR.paper,
            padding: "10px 18px",
            fontSize: 13,
            fontFamily: FONT.sans,
            textDecoration: "none",
            borderRadius: 2,
          }}
        >
          Open original ↗
        </a>
      </div>
    </div>
  );
}
