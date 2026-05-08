import { useMemo } from "react";
import OutletStamp, { LOGOS, LOGO_AR, OUTLET_LABELS } from "./receipt/OutletStamp";
import SeverityChip from "./receipt/SeverityChip";
import VibeStamp from "./receipt/VibeStamp";
import VolatilityBar from "./receipt/VolatilityBar";
import Perf from "./receipt/Perf";
import Barcode from "./receipt/Barcode";
import {
  serialFor,
  shortSerial,
  volatilityFor,
  maxSeverity,
  outletLedger,
  typeBreakdown,
  dashboardStats,
  rankByRecency,
  topChangeForArticle,
  formatAge,
  formatTimeOfDay,
  typeLabel,
  typeColor,
  currentHeadline,
  originalHeadline,
} from "../lib/receipt";
import { ALL_CHANGE_TYPES, ALL_OUTLETS } from "../constants";

function Stat({ label, value, tone }) {
  return (
    <div style={{ textAlign: "right", lineHeight: 1.05 }}>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontWeight: 600,
          fontSize: 30,
          color: tone === "red" ? "#e26a5d" : "#e8e6dd",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "#86847b",
          marginTop: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ColumnHeader({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 18, color: "#bfbdb4" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.32em", color: "#6d6b65" }}>
        {kicker}
      </div>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontWeight: 600,
          fontSize: 32,
          color: "#e8e6dd",
          lineHeight: 1.05,
          margin: "4px 0",
          letterSpacing: "-0.012em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "#86847b",
          textTransform: "uppercase",
        }}
      >
        {sub}
      </div>
      <div
        style={{
          height: 2,
          background: "repeating-linear-gradient(90deg, #4a4944 0 4px, transparent 4px 8px)",
          marginTop: 10,
        }}
      />
    </div>
  );
}

function TapeReceipt({ article, recentChanges, onSelect }) {
  if (!article) return null;
  const top = topChangeForArticle(article.id, recentChanges);
  const sev = top?.severity ?? maxSeverity(article);
  const changeCount = article.change_count ?? article.changes?.length ?? 0;
  const ageIso = top?.classified_at || article.last_checked || article.first_seen;
  const headline = currentHeadline(article);
  const isVibe = sev >= 4;
  return (
    <div
      className="paper tape-card"
      style={{ position: "relative", cursor: "pointer" }}
      onClick={() => onSelect?.(article.id)}
    >
      <Perf side="top" />
      <Perf side="bottom" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <OutletStamp outlet={article.outlet} />
        <span className="serial">{shortSerial(article)}</span>
      </div>
      <hr className="dotted-thin" />
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="label">{top ? typeLabel(top.change_type) : "—"}</span>
        <span className="leader" />
        <span className="value muted" style={{ fontSize: 10 }}>{formatAge(ageIso)}</span>
        <span style={{ width: 8 }} />
        <SeverityChip s={sev || 1} />
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          color: "var(--ink)",
          marginTop: 4,
          fontWeight: 600,
          letterSpacing: "-0.012em",
        }}
      >
        {headline}
      </div>
      {top?.summary && (
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 13,
            lineHeight: 1.45,
            color: "var(--ink-soft)",
            marginTop: 8,
          }}
        >
          ↳ {top.summary}
        </div>
      )}
      {isVibe && top?.summary && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            border: "1.5px dashed var(--red)",
            color: "var(--red-deep)",
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--red)", fontWeight: 700 }}
          >
            VIBE SHIFT ·
          </span>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontSize: 13,
              marginLeft: 6,
              color: "var(--red-deep)",
              lineHeight: 1.4,
            }}
          >
            {top.summary}
          </span>
        </div>
      )}
      <hr className="dotted" />
      <div className="row">
        <span className="label">CHANGES LOGGED</span>
        <span className="leader" />
        <span className="value">{String(changeCount).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function SpotlightReceipt({ article, onSelect }) {
  if (!article) return null;
  const top = (article.changes || []).reduce(
    (best, c) => (!best || (c.severity || 0) > (best.severity || 0) ? c : best),
    null
  );
  const vol = volatilityFor(article);
  const head = currentHeadline(article);
  const orig = originalHeadline(article);
  const ageIso = top?.classified_at || article.last_checked || article.first_seen;
  return (
    <div style={{ position: "relative" }}>
      <div
        className="paper tear-bottom spotlight-paper"
        style={{ position: "relative", cursor: "pointer" }}
        onClick={() => onSelect?.(article.id)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <OutletStamp outlet={article.outlet} size="lg" />
          <div style={{ textAlign: "right" }}>
            <div className="serial">{serialFor(article)}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-faded)", marginTop: 2 }}>
              VOL № {String(article.versions?.length || 0).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="double-rule" />

        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--ink-faded)", marginBottom: 6 }}>
          HEADLINE — REVISION {article.versions?.length || 1}
        </div>
        <div className="serif spotlight-h2" style={{ marginBottom: 8, fontWeight: 600, letterSpacing: "-0.012em" }}>
          <span className="diff-add">{head}</span>
        </div>
        {orig && orig !== head && (
          <div className="serif" style={{ fontSize: 16, lineHeight: 1.3, color: "var(--ink-faded)", fontWeight: 500 }}>
            ↳ <span className="diff-strike">{orig}</span>
          </div>
        )}

        <hr className="dotted" />

        {top && top.severity >= 3 && (
          <div style={{ position: "relative", padding: "6px 0 0" }}>
            <VibeStamp
              severity={top.severity}
              summary={top.summary || "Significant edit detected."}
              time={`${formatTimeOfDay(ageIso)} · ${formatAge(ageIso)}`}
            />
          </div>
        )}

        <hr className="dotted" />

        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--ink-faded)", marginBottom: 8 }}>
          REVISION LOG — {article.changes?.length || 0} EDITS
        </div>
        <div>
          {(article.changes || []).slice(0, 6).map((c) => (
            <div key={c.id} className="row" style={{ padding: "3px 0" }}>
              <span className="label">{typeLabel(c.change_type)}</span>
              <span className="leader" />
              <span className="value muted" style={{ fontSize: 10 }}>{formatTimeOfDay(c.classified_at)}</span>
              <span style={{ width: 10 }} />
              <SeverityChip s={c.severity || 1} />
            </div>
          ))}
        </div>

        <div className="solid-rule" />

        <div className="row" style={{ fontWeight: 700 }}>
          <span className="label">VOLATILITY</span>
          <span className="leader" />
          <span className="value" style={{ fontSize: 18, color: "var(--red)" }}>{vol}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <VolatilityBar value={vol} max={Math.max(40, vol)} />
        </div>

        <hr className="dotted" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--ink-faded)" }}>
            THANK&nbsp;YOU&nbsp;FOR&nbsp;READING&nbsp;CAREFULLY · ✂&nbsp;TEAR&nbsp;HERE
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          <Barcode seed={serialFor(article)} height={42} />
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.32em", textAlign: "center", marginTop: 6 }}>
            *{serialFor(article).replace(/-/g, " ").toUpperCase()}*
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerCard({ rows }) {
  return (
    <div className="paper paper-aged ledger-card" style={{ padding: "18px 20px", position: "relative" }}>
      <Perf side="top" />
      <Perf side="bottom" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mono smallcaps" style={{ fontSize: 11 }}>Outlet ledger</span>
        <span className="serial">VOL.</span>
      </div>
      <hr className="dotted-thin" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
        {rows.length === 0 && (
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-faded)" }}>no data yet</div>
        )}
        {rows.map((row) => (
          <div key={row.outlet} className="bar-row">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {LOGOS[row.outlet] && (
                <img
                  src={LOGOS[row.outlet]}
                  alt={row.label}
                  style={{
                    height: 11,
                    width: Math.round(11 * (LOGO_AR[row.outlet] || 2)),
                    maxWidth: 60,
                    objectFit: "contain",
                    filter: "grayscale(1) contrast(1.2)",
                  }}
                />
              )}
            </span>
            <span className="bar-track">
              <span
                className={"bar-fill " + (row.pct > 0.6 ? "red" : row.pct > 0.4 ? "amber" : "")}
                style={{ width: `${row.pct * 100}%` }}
              />
            </span>
            <span className="tabular" style={{ textAlign: "right", fontWeight: 700 }}>{row.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeBreakdownCard({ rows }) {
  const total = rows.reduce((s, x) => s + x.count, 0);
  const max = rows[0]?.count || 1;
  return (
    <div className="paper breakdown-card" style={{ padding: "18px 20px", position: "relative" }}>
      <Perf side="top" />
      <Perf side="bottom" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mono smallcaps" style={{ fontSize: 11 }}>Edit types</span>
        <span className="serial">N = {total}</span>
      </div>
      <hr className="dotted-thin" />
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
        {rows.length === 0 && (
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-faded)" }}>no data yet</div>
        )}
        {rows.map((row) => (
          <div key={row.label} className="bar-row" style={{ gridTemplateColumns: "92px 1fr 38px" }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{row.label}</span>
            <span className="bar-track">
              <span className={"bar-fill " + row.color} style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className="tabular" style={{ textAlign: "right", fontWeight: 700 }}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterStrip({ filters, onChange, search, onSearchChange }) {
  return (
    <div className="paper filter-card" style={{ padding: "18px 20px", position: "relative" }}>
      <Perf side="top" />
      <Perf side="bottom" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mono smallcaps" style={{ fontSize: 11 }}>Cashier</span>
        <span className="serial">FILTERS</span>
      </div>
      <hr className="dotted-thin" />
      <div style={{ marginTop: 8 }}>
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)", marginBottom: 4 }}
        >
          MIN. SEVERITY
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => {
            const on = s >= filters.minSeverity;
            return (
              <button
                key={s}
                onClick={() => onChange({ ...filters, minSeverity: s })}
                className={"sev sev-" + s}
                style={{
                  opacity: on ? 1 : 0.4,
                  cursor: "pointer",
                  background: "transparent",
                  fontFamily: "var(--mono)",
                }}
              >
                S·{s}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)", marginBottom: 6 }}
        >
          WINDOW
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["24h", "7d", "all"].map((w) => {
            const active = filters.window === w;
            return (
              <button
                key={w}
                onClick={() => onChange({ ...filters, window: w })}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  border: "1.2px solid var(--ink)",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--paper)" : "var(--ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)" }}
          >
            OUTLETS
          </span>
          <button
            onClick={() =>
              onChange({
                ...filters,
                outlets:
                  filters.outlets.length === ALL_OUTLETS.length ? [] : ALL_OUTLETS,
              })
            }
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--ink-faded)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textTransform: "uppercase",
            }}
          >
            {filters.outlets.length === ALL_OUTLETS.length ? "clear" : "all"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ALL_OUTLETS.map((o) => {
            const on = filters.outlets.includes(o);
            return (
              <button
                key={o}
                onClick={() =>
                  onChange({
                    ...filters,
                    outlets: on
                      ? filters.outlets.filter((x) => x !== o)
                      : [...filters.outlets, o],
                  })
                }
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  padding: "2px 6px",
                  border: "1px solid var(--ink)",
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--paper)" : "var(--ink)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {OUTLET_LABELS[o] || o}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)" }}
          >
            EDIT TYPES
          </span>
          <button
            onClick={() =>
              onChange({
                ...filters,
                changeTypes:
                  filters.changeTypes.length === ALL_CHANGE_TYPES.length
                    ? []
                    : ALL_CHANGE_TYPES,
              })
            }
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--ink-faded)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textTransform: "uppercase",
            }}
          >
            {filters.changeTypes.length === ALL_CHANGE_TYPES.length ? "clear" : "all"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ALL_CHANGE_TYPES.map((t) => {
            const on = filters.changeTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  onChange({
                    ...filters,
                    changeTypes: on
                      ? filters.changeTypes.filter((x) => x !== t)
                      : [...filters.changeTypes, t],
                  })
                }
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  padding: "2px 6px",
                  border: "1px solid var(--ink)",
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--paper)" : "var(--ink)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {typeLabel(t)}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)", marginBottom: 6 }}
        >
          SEARCH / URL
        </div>
        <div
          style={{
            borderBottom: "1.5px solid var(--ink)",
            padding: "3px 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="paste any article URL…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--ink-soft)",
              fontFamily: "var(--mono)",
              fontWeight: 500,
            }}
          />
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-faded)" }}>↩</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  articles,
  recentChanges,
  stats: serverStats,
  spotlight,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  onSelectArticle,
  loading,
  error,
}) {
  const stats = useMemo(() => {
    if (serverStats) {
      return {
        articles: serverStats.articles || 0,
        versions: serverStats.versions || 0,
        edits: serverStats.edits || 0,
        vibeShifts: serverStats.vibe_shifts || 0,
      };
    }
    return dashboardStats(articles, recentChanges);
  }, [serverStats, articles, recentChanges]);

  const ledger = useMemo(() => {
    if (serverStats?.by_outlet?.length) {
      const max = serverStats.by_outlet[0]?.score || 1;
      return serverStats.by_outlet.map((row) => ({
        outlet: row.outlet,
        label: OUTLET_LABELS[row.outlet] || row.outlet.toUpperCase(),
        score: row.score,
        pct: row.score / max,
      }));
    }
    return outletLedger(articles, recentChanges);
  }, [serverStats, articles, recentChanges]);

  const breakdown = useMemo(() => {
    if (serverStats?.by_type?.length) {
      return serverStats.by_type.map((row) => ({
        label: typeLabel(row.change_type),
        count: row.count,
        color: typeColor(row.change_type),
      }));
    }
    return typeBreakdown(recentChanges);
  }, [serverStats, recentChanges]);
  const trending = useMemo(
    () => rankByRecency(articles, recentChanges, 12),
    [articles, recentChanges]
  );

  const totalVolatility = useMemo(() => {
    if (!recentChanges) return 0;
    return recentChanges.reduce((s, c) => s + (c.severity || 0), 0);
  }, [recentChanges]);

  const tapeStamp = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()} ${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const tapeSerial = `RR-${tapeStamp.replace(/ /g, "-")}-${filters.window.toUpperCase()}`;

  const dateLine = useMemo(() => {
    const d = new Date();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `edits to news articles, accounted for · ${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${hh}:${mm}`;
  }, []);

  return (
    <div className="desk dash-shell" style={{ minHeight: "100vh", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          color: "#bfbdb4",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.32em",
              color: "#6d6b65",
            }}
          >
            DEPT. OF EDITORIAL VERIFICATION · CIRC. INTERNAL
          </div>
          <div
            className="dash-title"
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 600,
              color: "#e8e6dd",
              marginTop: 4,
              letterSpacing: "-0.018em",
            }}
          >
            ReadReceipt
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#9c9a91",
              marginTop: 6,
            }}
          >
            {dateLine}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#6d6b65",
            }}
          >
            ROLLING LEDGER
          </div>
          <div style={{ display: "flex", gap: 18, fontFamily: "var(--mono)", color: "#e8e6dd" }}>
            <Stat label="ARTICLES" value={stats.articles.toLocaleString()} />
            <Stat label="VERSIONS" value={stats.versions.toLocaleString()} />
            <Stat label="EDITS LOGGED" value={stats.edits.toLocaleString()} />
            <Stat label="VIBE SHIFTS" value={stats.vibeShifts.toLocaleString()} tone="red" />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #2c2418", marginBottom: 28 }} />

      {error && (
        <div
          className="mono"
          style={{
            color: "#e26a5d",
            fontSize: 11,
            letterSpacing: "0.18em",
            marginBottom: 18,
          }}
        >
          ERROR LOADING ARTICLES — {String(error.message || error)}
        </div>
      )}

      {loading && !articles && (
        <div
          className="mono"
          style={{ color: "#9c9a91", fontSize: 11, letterSpacing: "0.18em", marginBottom: 18 }}
        >
          POLLING THE TAPE…
        </div>
      )}

      <div className="dash-grid">
        <div style={{ minWidth: 0 }}>
          <ColumnHeader
            kicker="TAPE №&nbsp;01"
            title={filters.window === "24h" ? "Today’s tape" : "On the tape"}
            sub={`Articles in window · ${filters.window.toUpperCase()} · sorted by latest activity`}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {trending.length === 0 && !loading && (
              <div className="paper" style={{ padding: 18 }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-faded)" }}>
                  No volatile edits yet — try lowering severity or widening the window.
                </div>
              </div>
            )}
            {trending.map((a) => (
              <TapeReceipt
                key={a.id}
                article={a}
                recentChanges={recentChanges}
                onSelect={onSelectArticle}
              />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <ColumnHeader
            kicker="SPOTLIGHT"
            title="Most-revised story"
            sub={`Highest volatility · WINDOW ${filters.window.toUpperCase()} · ${recentChanges?.length || 0} changes in view`}
          />
          {spotlight ? (
            <SpotlightReceipt article={spotlight} onSelect={onSelectArticle} />
          ) : (
            <div className="paper" style={{ padding: 24 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-faded)" }}>
                Awaiting first revision.
              </div>
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <ColumnHeader kicker="LEDGER" title="By the numbers" sub="Outlets · types · cashier" />
          <div className="ledger-col">
            <FilterStrip
              filters={filters}
              onChange={onFiltersChange}
              search={search}
              onSearchChange={onSearchChange}
            />
            <LedgerCard rows={ledger} />
            <TypeBreakdownCard rows={breakdown} />
          </div>
        </div>
      </div>

      <div className="tape-spill">
        <div className="paper">
          <hr className="dotted" style={{ margin: "0 0 10px" }} />
          <div className="row" style={{ fontWeight: 700, fontSize: 14 }}>
            <span className="label">VOLATILITY (TOTAL)</span>
            <span className="leader" />
            <span className="value" style={{ color: "var(--red)", fontSize: 18 }}>
              {totalVolatility}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <VolatilityBar value={totalVolatility} max={Math.max(40, totalVolatility)} />
          </div>
          <hr className="dotted" />
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textAlign: "center",
              color: "var(--ink-faded)",
              marginBottom: 8,
            }}
          >
            ✂&nbsp;&nbsp;THANK&nbsp;YOU&nbsp;FOR&nbsp;READING&nbsp;CAREFULLY&nbsp;&nbsp;✂
          </div>
          <Barcode seed={tapeSerial} height={36} />
          <div
            className="mono"
            style={{ fontSize: 10, letterSpacing: "0.32em", textAlign: "center", marginTop: 6 }}
          >
            *RR {tapeStamp}*
          </div>
        </div>
        <span className="tape-note">↗ tape continues<br /><small>scroll for full log</small></span>
      </div>

      <div
        className="dash-footer-desktop"
        style={{
          marginTop: 40,
          paddingTop: 18,
          borderTop: "1px dashed #2c2418",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "#4a4944",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span>POLLED EVERY 30 MIN · CLASSIFIED BY CLAUDE HAIKU 4.5</span>
        <span>END OF TAPE — TEAR HERE ✂︎ — — — — — — — — — — — — — — — — — — —</span>
      </div>
    </div>
  );
}
