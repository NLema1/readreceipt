import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FONT, RR, Mono } from "./atoms";
import CommandPalette from "./CommandPalette";

const TABS = [
  { to: "/feed",   label: "Feed",   match: ["/", "/feed"] },
  { to: "/stats",  label: "Stats",  match: ["/stats"] },
  { to: "/search", label: "Search", match: ["/search"] },
  { to: "/method", label: "Method", match: ["/method"] },
];

function TopNav({ onOpenPalette }) {
  const loc = useLocation();
  const isActive = (paths) =>
    paths.some((p) => loc.pathname === p || (p !== "/" && loc.pathname.startsWith(p)));
  return (
    <div
      className="hidden md:flex"
      style={{
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 48px",
        borderBottom: `1px solid ${RR.hair}`,
        background: RR.paper,
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 32 }}>
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 22, color: RR.ink }}>
            Readreceipt
          </span>
        </NavLink>
        <div style={{ display: "flex", gap: 24 }}>
          {TABS.map((t) => {
            const active = isActive(t.match);
            return (
              <NavLink
                key={t.label}
                to={t.to}
                style={{
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? RR.ink : RR.soft,
                  borderBottom: active ? `1.5px solid ${RR.ink}` : "1.5px solid transparent",
                  paddingBottom: 4,
                }}
              >
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </div>
      <button
        onClick={onOpenPalette}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          border: `1px solid ${RR.hair2}`,
          background: RR.card,
          borderRadius: 2,
          minWidth: 320,
          cursor: "pointer",
          fontFamily: FONT.sans,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RR.soft} strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-5-5" />
        </svg>
        <span style={{ fontSize: 13, color: RR.mute, flex: 1, textAlign: "left" }}>
          Search headlines or paste a URL…
        </span>
        <Mono
          style={{
            color: RR.mute,
            fontSize: 10,
            padding: "2px 5px",
            border: `1px solid ${RR.hair2}`,
          }}
        >
          ⌘K
        </Mono>
      </button>
    </div>
  );
}

const TABBAR_ITEMS = [
  { k: "/",       label: "Home",   match: ["/"],         d: "M3 11 12 3l9 8v10h-6v-6h-6v6H3z" },
  { k: "/feed",   label: "Feed",   match: ["/feed"],     d: "M4 5h16M4 12h16M4 19h10" },
  { k: "/search", label: "Search", match: ["/search"],   d: "M11 19a8 8 0 1 1 5.3-14 8 8 0 0 1-5.3 14zM21 21l-4.3-4.3" },
  { k: "/stats",  label: "Stats",  match: ["/stats"],    d: "M4 20V10M10 20V4M16 20v-8M22 20H2" },
];

function MobileTabbar() {
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <div
      className="md:hidden grid grid-cols-4"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        borderTop: `1px solid ${RR.hair}`,
        background: RR.paper,
        zIndex: 20,
      }}
    >
      {TABBAR_ITEMS.map((it) => {
        const active = it.match.some(
          (p) => loc.pathname === p || (p !== "/" && loc.pathname.startsWith(p))
        );
        return (
          <button
            key={it.k}
            onClick={() => nav(it.k)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              border: "none",
              background: "transparent",
              color: active ? RR.ink : RR.mute,
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d={it.d} />
            </svg>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {it.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: RR.paper, color: RR.ink, fontFamily: FONT.sans }}>
      <TopNav onOpenPalette={() => setPaletteOpen(true)} />
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileTabbar />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
