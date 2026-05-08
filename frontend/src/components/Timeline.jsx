import { useMemo, useState } from "react";
import OutletStamp, { OUTLET_LABELS } from "./receipt/OutletStamp";
import SeverityChip from "./receipt/SeverityChip";
import LeaderRow from "./receipt/LeaderRow";
import VolatilityBar from "./receipt/VolatilityBar";
import VibeStamp from "./receipt/VibeStamp";
import Barcode from "./receipt/Barcode";
import {
  serialFor,
  volatilityFor,
  maxSeverity,
  formatTimestamp,
  formatTimeOfDay,
  formatAge,
  trackedSinceLabel,
  hoursTracked,
  originalHeadline,
  currentHeadline,
  typeLabel,
  wordDiff,
} from "../lib/receipt";

function HeadlineDiff({ oldText, newText }) {
  const segs = wordDiff(oldText, newText);
  return (
    <span>
      {segs.map((seg, i) => {
        const sep = i > 0 && !seg.text.match(/^\s/) ? " " : "";
        if (seg.kind === "same") return <span key={i}>{sep}{seg.text}</span>;
        if (seg.kind === "del")
          return (
            <span key={i}>
              {sep}
              <span className="diff-strike">{seg.text}</span>
            </span>
          );
        return (
          <span key={i}>
            {sep}
            <span className="diff-add">{seg.text}</span>
          </span>
        );
      })}
    </span>
  );
}

// Renders one side of a word-diff: the LEFT column shows same+del segments
// (preserving the original); the RIGHT column shows same+add (the new).
function DiffSide({ segments, side }) {
  return (
    <span>
      {segments.map((seg, i) => {
        const sep = i > 0 && !seg.text.match(/^\s/) ? " " : "";
        if (seg.kind === "same") return <span key={i}>{sep}{seg.text}</span>;
        if (seg.kind === "del" && side === "left") {
          return (
            <span key={i}>
              {sep}
              <span className="diff-strike">{seg.text}</span>
            </span>
          );
        }
        if (seg.kind === "add" && side === "right") {
          return (
            <span key={i}>
              {sep}
              <span className="diff-add">{seg.text}</span>
            </span>
          );
        }
        return null;
      })}
    </span>
  );
}

function SideBySideDiff({ fromVersion, toVersion }) {
  const headlineSegs = useMemo(
    () => wordDiff(fromVersion?.headline || "", toVersion?.headline || ""),
    [fromVersion, toVersion]
  );
  const bodySegs = useMemo(
    () => wordDiff(fromVersion?.body_text || "", toVersion?.body_text || ""),
    [fromVersion, toVersion]
  );
  return (
    <div className="sbs-diff">
      <div className="col">
        <div className="col-header">
          ORIGINAL · {formatTimestamp(fromVersion?.scraped_at)}
        </div>
        <div className="col-headline">
          <DiffSide segments={headlineSegs} side="left" />
        </div>
        <div className="col-body">
          <DiffSide segments={bodySegs} side="left" />
        </div>
      </div>
      <div className="sep" />
      <div className="col">
        <div className="col-header">
          CURRENT · {formatTimestamp(toVersion?.scraped_at)}
        </div>
        <div className="col-headline">
          <DiffSide segments={headlineSegs} side="right" />
        </div>
        <div className="col-body">
          <DiffSide segments={bodySegs} side="right" />
        </div>
      </div>
    </div>
  );
}

function RevisionRow({ change, fromVersion, toVersion }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !!(fromVersion && toVersion);
  return (
    <div style={{ borderBottom: "1px dotted var(--ink-faded)", padding: "8px 0" }}>
      <button
        type="button"
        className="rev-row"
        onClick={() => canExpand && setExpanded((v) => !v)}
        aria-expanded={expanded}
        disabled={!canExpand}
        style={{ cursor: canExpand ? "pointer" : "default" }}
      >
        <div className="row">
          <span className="label" style={{ minWidth: 96 }}>
            {typeLabel(change.change_type)}
          </span>
          <span className="leader" />
          <span className="value muted" style={{ fontSize: 10 }}>
            {formatTimestamp(change.classified_at)}
          </span>
          <span style={{ width: 8 }} />
          <SeverityChip s={change.severity || 1} />
          {canExpand && (
            <span className="glyph" aria-hidden="true">
              {expanded ? "▾" : "▸"}
            </span>
          )}
        </div>
        {change.summary && (
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 13,
              lineHeight: 1.45,
              color: "var(--ink-soft)",
              paddingLeft: 4,
              paddingTop: 4,
              maxWidth: "62ch",
            }}
          >
            {change.summary}
          </div>
        )}
      </button>
      {expanded && canExpand && (
        <SideBySideDiff fromVersion={fromVersion} toVersion={toVersion} />
      )}
    </div>
  );
}

function deskFrame(children) {
  return (
    <div
      className="desk detail-shell"
      style={{ minHeight: "100vh", position: "relative" }}
    >
      {children}
    </div>
  );
}

export default function Timeline({ article, loading, error, onClose }) {
  if (loading && !article) {
    return deskFrame(
      <TopBar onClose={onClose} />
    );
  }
  if (error) {
    return deskFrame(
      <>
        <TopBar onClose={onClose} />
        <div className="paper" style={{ padding: 30, maxWidth: 720, margin: "0 auto" }}>
          <div className="mono" style={{ color: "var(--red-deep)" }}>
            Error loading article — {String(error.message || error)}
          </div>
        </div>
      </>
    );
  }
  if (!article) {
    return deskFrame(
      <>
        <TopBar onClose={onClose} />
        <div className="paper" style={{ padding: 30, maxWidth: 720, margin: "0 auto" }}>
          <div className="mono" style={{ color: "var(--ink-faded)" }}>
            Select an article to see its timeline.
          </div>
        </div>
      </>
    );
  }

  const total = article.changes?.length || 0;
  const max = maxSeverity(article);
  const vol = volatilityFor(article);
  const head = currentHeadline(article);
  const orig = originalHeadline(article);
  const versions = article.versions || [];
  const versionCount = versions.length;
  const versionsById = useMemo(() => {
    const map = new Map();
    for (const v of versions) map.set(v.id, v);
    return map;
  }, [versions]);
  const top = (article.changes || []).reduce(
    (best, c) => (!best || (c.severity || 0) > (best.severity || 0) ? c : best),
    null
  );
  const outletLabel =
    OUTLET_LABELS[article.outlet] || (article.outlet || "").toUpperCase();

  const cosmetic = (article.changes || [])
    .filter((c) => (c.severity || 0) <= 2)
    .reduce((s, c) => s + (c.severity || 0), 0);
  const meaningful = (article.changes || [])
    .filter((c) => (c.severity || 0) >= 3)
    .reduce((s, c) => s + (c.severity || 0), 0);

  return deskFrame(
    <>
      <TopBar onClose={onClose} />
      <div style={{ position: "relative", width: "min(720px, 100%)", margin: "0 auto" }}>
        <div className="paper detail-paper" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="serial">RECEIPT №</div>
              <div
                className="mono"
                style={{ fontSize: 14, letterSpacing: "0.16em", fontWeight: 700, marginTop: 2 }}
              >
                {serialFor(article)}
              </div>
            </div>
            <OutletStamp outlet={article.outlet} size="lg" />
          </div>

          <hr className="solid-rule" style={{ marginTop: 14 }} />

          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--ink-faded)" }}>
            ARTICLE — CURRENT REVISION
          </div>
          <h1
            className="serif detail-h1"
            style={{
              fontWeight: 600,
              margin: "8px 0 14px",
              letterSpacing: "-0.018em",
            }}
          >
            <span className="diff-add" style={{ borderBottomWidth: 0, background: "none" }}>
              {head}
            </span>
          </h1>

          {orig && orig !== head && (
            <div
              className="serif"
              style={{ fontWeight: 500, fontSize: 17, lineHeight: 1.3, color: "var(--ink-faded)" }}
            >
              ↳ originally:&nbsp;<span className="diff-strike">{orig}</span>
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="action-stamp"
            >
              READ ARTICLE AT {outletLabel}
              <span className="arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="detail-meta-grid" style={{ marginTop: 18 }}>
            <LeaderRow label="Tracked since" value={trackedSinceLabel(article)} />
            <LeaderRow label="Versions logged" value={String(versionCount).padStart(2, "0")} />
            <LeaderRow label="Window" value={`${hoursTracked(article)} H`} />
            <LeaderRow label="Last poll" value={formatAge(article.last_checked || article.first_seen)} />
          </div>

          <hr className="dotted" />

          {top && top.severity >= 3 && (
            <>
              <div style={{ position: "relative", margin: "10px 0 18px" }}>
                <VibeStamp
                  severity={top.severity}
                  summary={top.summary || "Significant edit detected."}
                  block
                  maxWidth={520}
                  source={`${typeLabel(top.change_type)} EDIT · ${formatTimeOfDay(top.classified_at)}`}
                  time="CLF · CLAUDE-HAIKU-4.5"
                />
              </div>
              <hr className="dotted" />
            </>
          )}

          {orig && orig !== head && (
            <>
              <div
                className="mono"
                style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--ink-faded)", marginBottom: 8 }}
              >
                HEADLINE DIFF · v{Math.max(1, versionCount - 1)} → v{versionCount}
              </div>
              <div className="diff-grid" style={{ marginBottom: 18 }}>
                <div style={{ borderTop: "1.2px solid var(--ink)", paddingTop: 8 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-faded)" }}
                  >
                    ORIGINAL · {formatTimeOfDay(versions[0]?.scraped_at)}
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 16,
                      lineHeight: 1.3,
                      marginTop: 6,
                      fontWeight: 500,
                      color: "var(--ink-faded)",
                    }}
                  >
                    <span className="diff-strike">{orig}</span>
                  </div>
                </div>
                <div style={{ borderTop: "1.2px solid var(--ink)", paddingTop: 8 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-faded)" }}
                  >
                    CURRENT · {formatTimeOfDay(versions[versions.length - 1]?.scraped_at)}
                  </div>
                  <div
                    className="serif"
                    style={{ fontSize: 16, lineHeight: 1.3, marginTop: 6, fontWeight: 600 }}
                  >
                    <HeadlineDiff oldText={orig} newText={head} />
                  </div>
                </div>
              </div>
              <hr className="dotted" />
            </>
          )}

          <div
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--ink-faded)", marginBottom: 6 }}
          >
            ITEMIZED REVISION LOG
          </div>
          {total === 0 ? (
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-faded)", padding: "10px 0" }}
            >
              no changes detected yet — we'll log them here as they happen
            </div>
          ) : (
            <div>
              {(article.changes || []).map((c) => (
                <RevisionRow
                  key={c.id}
                  change={c}
                  fromVersion={versionsById.get(c.from_version_id)}
                  toVersion={versionsById.get(c.to_version_id)}
                />
              ))}
            </div>
          )}

          <hr className="solid-rule" style={{ marginTop: 18 }} />

          <div className="row">
            <span className="label">SUBTOTAL · COSMETIC</span>
            <span className="leader" />
            <span className="value muted">{cosmetic}</span>
          </div>
          <div className="row">
            <span className="label">SUBTOTAL · MEANING</span>
            <span className="leader" />
            <span className="value">{meaningful}</span>
          </div>
          <hr className="solid-rule" />
          <div className="row" style={{ fontWeight: 700, fontSize: 16 }}>
            <span className="label" style={{ fontWeight: 700, fontSize: 14 }}>
              VOLATILITY (TOTAL)
            </span>
            <span className="leader" />
            <span className="value" style={{ fontSize: 22, color: "var(--red)" }}>{vol}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <VolatilityBar value={vol} max={Math.max(40, vol)} />
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)", marginTop: 12 }}>
            MAX SEVERITY · S·{max || 0}
          </div>

          <hr className="dotted" />

          <div
            className="mono"
            style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faded)", textAlign: "center" }}
          >
            ✂&nbsp;&nbsp;CUSTOMER COPY · KEEP FOR YOUR RECORDS&nbsp;&nbsp;✂
          </div>
          <div style={{ marginTop: 12 }}>
            <Barcode seed={serialFor(article)} height={48} />
            <div
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.32em", textAlign: "center", marginTop: 8 }}
            >
              *{serialFor(article).replace(/-/g, " ").toUpperCase()}*
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.22em",
                textAlign: "center",
                color: "var(--ink-faded)",
                marginTop: 6,
              }}
            >
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--ink-faded)", textDecoration: "none" }}
              >
                VIEW SOURCE → {article.url}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TopBar({ onClose }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        color: "#9c9a91",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          className="serif"
          style={{ fontWeight: 600, fontSize: 26, color: "#e8e6dd", letterSpacing: "-0.012em" }}
        >
          ReadReceipt
        </span>
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.22em", color: "#6d6b65" }}
        >
          / ARTICLE&nbsp;DETAIL
        </span>
      </div>
      <button
        onClick={onClose}
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "#6d6b65",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← BACK TO TAPE
      </button>
    </div>
  );
}
