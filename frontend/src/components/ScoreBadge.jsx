import { SEVERITY_BADGE_COLORS } from "../constants";

export default function ScoreBadge({ severity, changeCount, size = "md" }) {
  const cfg = SEVERITY_BADGE_COLORS[severity] ?? SEVERITY_BADGE_COLORS[0];
  const sizes = {
    sm: { box: 32, padY: 4, sevText: 12, countText: 10 },
    md: { box: 44, padY: 6, sevText: 15, countText: 11 },
    lg: { box: 56, padY: 8, sevText: 18, countText: 12 },
  };
  const s = sizes[size] ?? sizes.md;
  return (
    <div
      className="font-mono tabular-nums"
      style={{
        width: `${s.box}px`,
        flexShrink: 0,
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: cfg.bg,
          color: cfg.text,
          fontSize: `${s.sevText}px`,
          fontWeight: 700,
          letterSpacing: "0.02em",
          padding: `${s.padY}px 0`,
          borderRadius: "4px",
          lineHeight: 1,
        }}
      >
        {cfg.label}
      </div>
      {typeof changeCount === "number" && (
        <div
          style={{
            color: "#737373",
            fontSize: `${s.countText}px`,
            marginTop: "4px",
            lineHeight: 1,
          }}
        >
          {changeCount} ch
        </div>
      )}
    </div>
  );
}
