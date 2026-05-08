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
  topVolatile,
  outletLedger,
  typeBreakdown,
  dashboardStats,
  formatAge,
  formatTimeOfDay,
  typeLabel,
  currentHeadline,
  originalHeadline,
} from "../lib/receipt";

function Stat({ label, value, tone }) {
  return (
    <div style={{ textAlign: "right", lineHeight: 1.05 }}>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: 30,
          color: tone === "red" ? "#e26a5d" : "#f1e3bd",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#7a6a4a", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function ColumnHeader({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 18, color: "#d8c79a" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.32em", color: "#7a6a4a" }}>
        {kicker}
      </div>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: 32,
          color: "#f1e3bd",
          lineHeight: 1,
          margin: "4px 0",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "#8a7a55",
          textTransform: "uppercase",
        }}
      >
        {sub}
      </div>
      <div
        style={{
          height: 2,
          background: "repeating-linear-gradient(90deg, #5a4d33 0 4px, transparent 4px 8px)",
          marginTop: 10,
        }}
      />
    </div>
  );
}

function TapeReceipt({ article, onSelect }) {
  if (!article) return null;
  const sev = maxSeverity(article);
  const top = (article.changes || []).reduce(
    (best, c) => (!best || (c.severity || 0) > (best.severity || 0) ? c : best),
    null
  );
  const ageIso = top?.classified_at || article.last_checked || article.first_seen;
  const headline = currentHeadline(article);
  const isVibe = sev >= 4;
  return (
    <div
      className="paper"
      style={{ padding: "18px 20px 20px", position: "relative", cursor: "pointer" }}
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
          lineHeight: 1.15,
          color: "var(--ink)",
          marginTop: 4,
          fontStyle: "italic",
          letterSpacing: "-0.005em",
        }}
      >
        {headline}
      </div>
      {top?.summary && (
        <div className="typed" style={{ marginTop: 8, lineHeight: 1.4, fontSize: 12 }}>
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
            className="serif"
            style={{ fontStyle: "italic", fontSize: 14, marginLeft: 6, color: "var(--red-deep)" }}
          >
            {top.summary}
          </span>
        </div>
      )}
      <hr className="dotted" />
      <div className="row">
        <span className="label">CHANGES LOGGED</span>
        <span className="leader" />
        <span className="value">{String(article.changes?.length || 0).padStart(2, "0")}</span>
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
        className="paper tear-bottom"
        style={{ padding: "26px 30px 28px", position: "relative", cursor: "pointer" }}
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
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 8, fontStyle: "italic" }}>
          <span className="diff-add">{head}</span>
        </div>
        {orig && orig !== head && (
          <div className="serif" style={{ fontSize: 16, lineHeight: 1.2, color: "var(--ink-faded)", fontStyle: "italic" }}>
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
    <div className="paper paper-aged" style={{ padding: "18px 20px", position: "relative" }}>
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
    <div className="paper" style={{ padding: "18px 20px", position: "relative" }}>
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
    <div className="paper" style={{ padding: "18px 20px", position: "relative" }}>
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
            className="type"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--ink-soft)",
              fontFamily: "var(--type)",
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
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  onSelectArticle,
  loading,
  error,
}) {
  const stats = useMemo(() => dashboardStats(articles || []), [articles]);
  const ledger = useMemo(() => outletLedger(articles || []), [articles]);
  const breakdown = useMemo(() => typeBreakdown(articles || []), [articles]);
  const spotlight = useMemo(() => topVolatile(articles || []), [articles]);

  const trending = useMemo(() => {
    const list = articles || [];
    return [...list].sort((a, b) => volatilityFor(b) - volatilityFor(a)).slice(0, 6);
  }, [articles]);

  const dateLine = useMemo(() => {
    const d = new Date();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `edits to news articles, accounted for · ${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${hh}:${mm}`;
  }, []);

  return (
    <div className="desk" style={{ minHeight: "100vh", padding: "36px 44px", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          color: "#d8c79a",
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
              color: "#7a6a4a",
            }}
          >
            DEPT. OF EDITORIAL VERIFICATION · CIRC. INTERNAL
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 64,
              lineHeight: 1,
              color: "#f1e3bd",
              marginTop: 4,
              letterSpacing: "-0.01em",
            }}
          >
            ReadReceipt
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#a8946a",
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
              color: "#7a6a4a",
            }}
          >
            ROLLING LEDGER
          </div>
          <div style={{ display: "flex", gap: 18, fontFamily: "var(--mono)", color: "#f1e3bd" }}>
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
          style={{ color: "#a8946a", fontSize: 11, letterSpacing: "0.18em", marginBottom: 18 }}
        >
          POLLING THE TAPE…
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(280px, 320px)",
          gap: 36,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <ColumnHeader kicker="TAPE №&nbsp;01" title="Today’s tape" sub="Most volatile, top of the pile" />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {trending.length === 0 && !loading && (
              <div className="paper" style={{ padding: 18 }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-faded)" }}>
                  No volatile edits yet — try lowering severity or widening the window.
                </div>
              </div>
            )}
            {trending.map((a) => (
              <TapeReceipt key={a.id} article={a} onSelect={onSelectArticle} />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <ColumnHeader kicker="SPOTLIGHT" title="Most-revised story" sub="Highest volatility on the tape" />
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
          <LedgerCard rows={ledger} />
          <div style={{ height: 24 }} />
          <TypeBreakdownCard rows={breakdown} />
          <div style={{ height: 24 }} />
          <FilterStrip
            filters={filters}
            onChange={onFiltersChange}
            search={search}
            onSearchChange={onSearchChange}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          paddingTop: 18,
          borderTop: "1px dashed #2c2418",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "#5a4d33",
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
