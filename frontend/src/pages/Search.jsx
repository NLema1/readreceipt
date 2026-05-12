import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FONT, RR,
  Hair, Kicker, Mono, OutletMark, SevPill, TypeTag,
  OUTLETS, OUTLET_KEYS, CHANGE_TYPES, CHANGE_TYPE_KEYS,
} from "../components/atoms";
import { fetchArticles } from "../api";
import { ageLabel } from "../lib/format";
import { sinceFor } from "../lib/time";
import { looksLikeUrl, normalizeUrl } from "../lib/url";
import {
  ARTICLE_ID_PREFIX,
  DEBOUNCE_MS,
  WINDOW_KEYS,
  WINDOW_LABELS,
} from "../constants";

const WINDOWS = WINDOW_KEYS.map((k) => ({ k, l: WINDOW_LABELS[k] }));

function highlight(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: `${RR.amber}33`, padding: "0 4px" }}>
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [q, setQ] = useState(params.get("q") || "");
  const [outlets, setOutlets] = useState(() => new Set(params.getAll("outlet")));
  const [types, setTypes] = useState(() => new Set(params.getAll("type")));
  const [minSev, setMinSev] = useState(Number(params.get("sev") || 1));
  const [windowKey, setWindowKey] = useState(params.get("window") || "7d");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(null); // { jumpTo: id, message }

  // Sync state -> URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    for (const o of outlets) next.append("outlet", o);
    for (const t of types) next.append("type", t);
    if (minSev !== 1) next.set("sev", String(minSev));
    if (windowKey !== "7d") next.set("window", windowKey);
    setParams(next, { replace: true });
  }, [q, outlets, types, minSev, windowKey, setParams]);

  // Fetch results (debounced)
  useEffect(() => {
    let cancelled = false;
    const isUrl = looksLikeUrl(q);
    const url = isUrl ? normalizeUrl(q) : undefined;
    const text = !isUrl ? q.trim() : undefined;

    const timer = setTimeout(async () => {
      setLoading(true);
      setResolved(null);
      try {
        const single = outlets.size === 1 ? Array.from(outlets)[0] : undefined;
        const typeArr = Array.from(types);
        const data = await fetchArticles({
          minSeverity: minSev,
          outlet: single,
          since: sinceFor(windowKey),
          q: text || undefined,
          url,
          changeTypes: typeArr.length ? typeArr : undefined,
        });
        if (cancelled) return;
        // Apply multi-outlet filter client-side
        let filtered = data;
        if (outlets.size > 1) filtered = data.filter((a) => outlets.has(a.outlet));
        setResults(filtered);
        if (isUrl && filtered.length === 1) {
          setResolved({ jumpTo: filtered[0].id, headline: filtered[0].headline });
        }
      } catch (e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS.SEARCH);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, outlets, types, minSev, windowKey]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggle = (set, setter) => (k) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setter(next);
  };
  const toggleOutlet = toggle(outlets, setOutlets);
  const toggleType = toggle(types, setTypes);

  const SUGGESTED = [
    { k: "outlet:guardian", apply: () => setOutlets(new Set(["guardian"])) },
    { k: "severity:4+",     apply: () => setMinSev(4) },
    { k: "type:headline",   apply: () => setTypes(new Set(["headline_change"])) },
    { k: "since:24h",       apply: () => setWindowKey("24h") },
    { k: "since:all",       apply: () => setWindowKey("all") },
  ];

  // ---------------- DESKTOP ----------------
  const desktop = (
    <div className="hidden md:block">
      <div style={{ padding: "48px 48px 24px" }}>
        <Kicker>Search the full ledger</Kicker>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 16,
            borderBottom: `2px solid ${RR.ink}`,
            padding: "8px 0",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RR.ink} strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-5-5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headlines, paste any article URL, or describe an edit…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: FONT.serif,
              fontStyle: "italic",
              fontSize: 32,
              color: RR.ink,
              padding: "6px 0",
            }}
          />
          <Mono style={{ color: RR.mute, fontSize: 10, padding: "4px 8px", border: `1px solid ${RR.hair2}` }}>
            ⌘K
          </Mono>
        </div>
        {resolved && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Mono style={{ color: RR.green, letterSpacing: "0.16em" }}>URL RESOLVED →</Mono>
            <button
              onClick={() => navigate(`/article/${resolved.jumpTo}`)}
              style={{
                background: RR.ink,
                color: RR.paper,
                border: "none",
                padding: "8px 14px",
                borderRadius: 2,
                fontSize: 12,
                fontFamily: FONT.sans,
                cursor: "pointer",
              }}
            >
              Open {ARTICLE_ID_PREFIX}{resolved.jumpTo} →
            </button>
            <span style={{ fontSize: 13, color: RR.ink2 }}>{resolved.headline}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Mono style={{ color: RR.soft, fontSize: 10, letterSpacing: "0.16em" }}>SUGGESTED:</Mono>
          {SUGGESTED.map((s) => (
            <button
              key={s.k}
              onClick={s.apply}
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                color: RR.ink2,
                padding: "4px 10px",
                border: `1px solid ${RR.hair2}`,
                background: RR.card,
                borderRadius: 2,
                cursor: "pointer",
              }}
            >
              {s.k}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "12px 48px 56px",
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 32,
        }}
      >
        {/* FILTER RAIL */}
        <div style={{ borderRight: `1px solid ${RR.hair}`, paddingRight: 24 }}>
          <Kicker style={{ marginBottom: 10 }}>Outlet</Kicker>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {OUTLET_KEYS.map((k) => {
              const o = OUTLETS[k];
              const on = outlets.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleOutlet(k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "transparent",
                    border: "none",
                    padding: "4px 0",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: `1.5px solid ${on ? RR.ink : RR.hair2}`,
                      background: on ? RR.ink : "transparent",
                      borderRadius: 2,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on && <span style={{ color: RR.paper, fontSize: 9, fontWeight: 700 }}>✓</span>}
                  </span>
                  <img src={o.logo} alt={o.label} style={{ height: 12, maxWidth: 60, filter: "grayscale(1)" }} />
                  <span style={{ flex: 1, fontSize: 12, color: RR.ink2 }}>{o.short}</span>
                </button>
              );
            })}
            {outlets.size > 0 && (
              <button
                onClick={() => setOutlets(new Set())}
                style={{
                  marginTop: 4,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: RR.soft,
                  padding: 0,
                }}
              >
                CLEAR
              </button>
            )}
          </div>

          <Kicker style={{ marginBottom: 10 }}>Min severity</Kicker>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const on = minSev === s;
              return (
                <button
                  key={s}
                  onClick={() => setMinSev(s)}
                  style={{
                    background: on ? RR.ink : "transparent",
                    color: on ? RR.paper : RR.ink,
                    border: `1px solid ${on ? RR.ink : RR.hair2}`,
                    padding: "3px 8px",
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  S·{s}
                </button>
              );
            })}
          </div>

          <Kicker style={{ marginBottom: 10 }}>Edit type</Kicker>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {CHANGE_TYPE_KEYS.filter((k) => k !== "other").map((k) => {
              const t = CHANGE_TYPES[k];
              const on = types.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleType(k)}
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    padding: "4px 8px",
                    letterSpacing: "0.08em",
                    border: `1px solid ${on ? RR.ink : RR.hair2}`,
                    background: on ? RR.ink : "transparent",
                    color: on ? RR.paper : RR.ink2,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: 2,
                  }}
                >
                  {t.short}
                </button>
              );
            })}
          </div>

          <Kicker style={{ marginBottom: 10 }}>Window</Kicker>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {WINDOWS.map((w) => {
              const on = windowKey === w.k;
              return (
                <button
                  key={w.k}
                  onClick={() => setWindowKey(w.k)}
                  style={{
                    background: on ? RR.ink : "transparent",
                    color: on ? RR.paper : RR.ink,
                    border: `1px solid ${on ? RR.ink : RR.hair2}`,
                    padding: "6px 10px",
                    fontFamily: FONT.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    borderRadius: 2,
                  }}
                >
                  {w.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESULTS */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 22, fontStyle: "italic" }}>
              <span style={{ color: RR.red }}>{loading ? "…" : results.length} results</span>{" "}
              {q && (
                <>
                  for <span style={{ background: `${RR.amber}22`, padding: "0 6px" }}>"{q}"</span>
                </>
              )}
            </div>
            <Mono style={{ color: RR.soft, fontSize: 11 }}>Sorted by relevance</Mono>
          </div>
          <Hair style={{ marginBottom: 0, background: RR.ink, height: 1 }} />
          {results.length === 0 && !loading && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: RR.soft,
                fontFamily: FONT.serif,
                fontSize: 18,
              }}
            >
              No matches. Try a different search.
            </div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/article/${a.id}`)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "20px 0",
                borderBottom: `1px solid ${RR.hair}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <OutletMark outlet={a.outlet} height={11} />
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: RR.mute }} />
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: "0.12em" }}>
                  {ageLabel(a.first_seen)}
                </Mono>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: RR.mute }} />
                <SevPill s={a.max_severity || 0} />
              </div>
              <div style={{ fontFamily: FONT.serif, fontSize: 22, lineHeight: 1.25, color: RR.ink }}>
                {highlight(a.headline, q)}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 18, alignItems: "center" }}>
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: "0.14em" }}>{ARTICLE_ID_PREFIX}{a.id}</Mono>
                <Mono style={{ fontSize: 10, color: RR.soft, letterSpacing: "0.14em" }}>
                  {a.change_count || 0} EDITS
                </Mono>
                <span
                  style={{
                    fontSize: 12,
                    color: RR.ink,
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  Open timeline →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ---------------- MOBILE ----------------
  const mobile = (
    <div className="md:hidden">
      <div style={{ padding: "14px 18px 12px", background: RR.paper }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            border: `1px solid ${RR.ink}`,
            borderRadius: 2,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RR.ink} strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headlines, paste a URL…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: FONT.serif,
              fontSize: 18,
              color: RR.ink,
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{ border: "none", background: "transparent", color: RR.soft, fontSize: 16, padding: 0, cursor: "pointer" }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* compact filter rows */}
      <div style={{ borderTop: `1px solid ${RR.hair}`, borderBottom: `1px solid ${RR.hair}`, background: RR.paper2 }}>
        <FilterRow label="Sev" current={minSev}>
          {[1, 2, 3, 4, 5].map((s) => {
            const on = minSev === s;
            return (
              <button
                key={s}
                onClick={() => setMinSev(s)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${on ? RR.ink : RR.hair2}`,
                  background: on ? RR.ink : "transparent",
                  color: on ? RR.paper : RR.ink,
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "5px 9px",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                S·{s}
              </button>
            );
          })}
        </FilterRow>
        <FilterRow label="Window">
          {WINDOWS.map((w) => {
            const on = windowKey === w.k;
            return (
              <button
                key={w.k}
                onClick={() => setWindowKey(w.k)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${on ? RR.ink : RR.hair2}`,
                  background: on ? RR.ink : "transparent",
                  color: on ? RR.paper : RR.ink,
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "5px 9px",
                  borderRadius: 2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {w.k === "all" ? "All" : w.k}
              </button>
            );
          })}
        </FilterRow>
        <FilterRow label="Type" last>
          {CHANGE_TYPE_KEYS.filter((k) => k !== "other").map((k) => {
            const t = CHANGE_TYPES[k];
            const on = types.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleType(k)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${on ? RR.ink : RR.hair2}`,
                  background: on ? RR.ink : "transparent",
                  color: on ? RR.paper : RR.ink2,
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "5px 9px",
                  borderRadius: 2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.short}
              </button>
            );
          })}
        </FilterRow>
      </div>

      <div style={{ padding: "12px 18px 4px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 16, color: RR.ink }}>
          <span style={{ fontStyle: "italic", color: RR.redDeep }}>{loading ? "…" : results.length}</span> results
        </div>
        <Mono style={{ color: RR.soft }}>SORT · NEWEST</Mono>
      </div>

      <div>
        {results.map((a) => (
          <button
            key={a.id}
            onClick={() => navigate(`/article/${a.id}`)}
            style={{
              width: "100%",
              padding: "12px 18px",
              borderTop: `1px solid ${RR.hair}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "transparent",
              border: "none",
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: RR.hair,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <OutletMark outlet={a.outlet} height={11} />
              <SevPill s={a.max_severity || 0} />
            </div>
            <div style={{ fontFamily: FONT.serif, fontSize: 16, lineHeight: 1.25, color: RR.ink }}>
              {highlight(a.headline, q)}
            </div>
            <Mono style={{ color: RR.soft, fontSize: 10 }}>
              {a.change_count || 0} edits · {ageLabel(a.first_seen)}
            </Mono>
          </button>
        ))}
        {results.length === 0 && !loading && (
          <div
            style={{
              padding: "40px 18px",
              textAlign: "center",
              color: RR.soft,
              fontFamily: FONT.serif,
              fontSize: 16,
            }}
          >
            No matches.
          </div>
        )}
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

function FilterRow({ label, children, last }) {
  return (
    <div
      className="no-scrollbar"
      style={{
        padding: "10px 18px",
        borderBottom: last ? "none" : `1px solid ${RR.hair}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 64,
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: RR.soft,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", flex: 1 }}>{children}</div>
    </div>
  );
}
