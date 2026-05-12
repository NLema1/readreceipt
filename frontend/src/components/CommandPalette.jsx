import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FONT, RR, Mono, OutletMark, SevPill, TypeTag } from "./atoms";
import { fetchArticles } from "../api";
import { looksLikeUrl, normalizeUrl } from "../lib/url";
import { DEBOUNCE_MS } from "../constants";

const INK_OVERLAY = "#0a0805";
const INK_LINE = "#2a241b";
const INK_TEXT = "#f6f1e6";
const INK_DIM = "#9c9077";

const FILTER_SHORTCUTS = [
  { key: "f", label: "Open feed",                go: "/feed" },
  { key: "s", label: "Open search page",         go: "/search" },
  { key: "x", label: "Open stats",               go: "/stats" },
  { key: "4", label: "Severity 4+ in last 24h",  go: "/search?sev=4&window=24h" },
  { key: "h", label: "Headline changes today",   go: "/search?type=headline_change&window=24h" },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Live query
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const isUrl = looksLikeUrl(q);
    const url = isUrl ? normalizeUrl(q) : undefined;
    const text = !isUrl ? q.trim() : undefined;

    if (!text && !url) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchArticles({
          minSeverity: 0,
          since: "all",
          q: text,
          url,
        });
        if (!cancelled) {
          setResults(data.slice(0, 8));
          setActive(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS.COMMAND_PALETTE);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, open]);

  const items = useMemo(() => {
    if (q.trim()) {
      return results.map((a) => ({
        kind: "article",
        id: a.id,
        title: a.headline,
        outlet: a.outlet,
        sev: a.max_severity || 0,
        edits: a.change_count || 0,
        action: () => navigate(`/article/${a.id}`),
      }));
    }
    return FILTER_SHORTCUTS.map((s) => ({
      kind: "shortcut",
      title: s.label,
      shortcut: s.key,
      action: () => navigate(s.go),
    }));
  }, [q, results, navigate]);

  const handleKey = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = items[active];
        if (it) {
          it.action();
          onClose();
        }
      }
    },
    [open, items, active, onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  const isUrlInput = looksLikeUrl(q);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,17,13,0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, calc(100% - 32px))",
          background: INK_OVERLAY,
          color: INK_TEXT,
          padding: "16px 18px 12px",
          borderRadius: 4,
          boxShadow: "0 30px 60px -20px rgba(20,17,13,0.6)",
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 12,
            borderBottom: `1px solid ${INK_LINE}`,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={INK_TEXT}
            strokeWidth="1.8"
            opacity="0.7"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-5-5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Paste a URL or type to search…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: FONT.sans,
              fontSize: 16,
              color: INK_TEXT,
              padding: 0,
            }}
          />
          {isUrlInput && (
            <Mono style={{ color: RR.green, fontSize: 9, letterSpacing: "0.18em" }}>
              URL DETECTED
            </Mono>
          )}
        </div>

        <div style={{ paddingTop: 10 }}>
          <Mono
            style={{
              fontSize: 9,
              color: INK_DIM,
              letterSpacing: "0.18em",
              display: "block",
              marginBottom: 6,
            }}
          >
            {q.trim() ? (loading ? "SEARCHING…" : `${results.length} RESULTS`) : "QUICK ACTIONS"}
          </Mono>

          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            {items.length === 0 && q.trim() && !loading && (
              <div style={{ padding: "12px 6px", color: INK_DIM, fontSize: 13 }}>
                No matches in the ledger.
              </div>
            )}
            {items.map((it, i) => {
              const isActive = i === active;
              return (
                <button
                  key={(it.kind || "row") + (it.id ?? it.shortcut ?? i)}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { it.action(); onClose(); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 6px",
                    background: isActive ? "#1f1a11" : "transparent",
                    borderRadius: 3,
                    margin: "0 -6px",
                    border: "none",
                    color: INK_TEXT,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      padding: "2px 6px",
                      border: `1px solid ${INK_LINE}`,
                      color: "#a8946a",
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  >
                    {it.shortcut || "⏎"}
                  </span>
                  <span style={{ fontSize: 13, color: INK_TEXT, flex: 1 }}>
                    {it.title}
                  </span>
                  {it.kind === "article" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ filter: "invert(1) opacity(0.85)" }}>
                        <OutletMark outlet={it.outlet} height={10} withName={false} />
                      </span>
                      <SevPill s={it.sev} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 10,
            marginTop: 8,
            borderTop: `1px solid ${INK_LINE}`,
            color: INK_DIM,
          }}
        >
          <Mono style={{ fontSize: 9, letterSpacing: "0.16em", color: INK_DIM }}>
            ↑↓ NAVIGATE · ⏎ OPEN · ESC CLOSE
          </Mono>
          <Mono style={{ fontSize: 9, letterSpacing: "0.16em", color: INK_DIM }}>
            ⌘K · Readreceipt
          </Mono>
        </div>
      </div>
    </div>
  );
}
