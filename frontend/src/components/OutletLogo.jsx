const OUTLET_BADGES = {
  guardian: { label: "G", color: "#052962", title: "The Guardian" },
  bbc:      { label: "BBC", color: "#BB1919", title: "BBC News" },
  npr:      { label: "NPR", color: "#0388CC", title: "NPR" },
};

export default function OutletLogo({ outlet }) {
  const badge = OUTLET_BADGES[outlet];
  if (!badge) return null;
  return (
    <span
      role="img"
      aria-label={badge.title}
      title={badge.title}
      style={{
        background: badge.color,
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        padding: "2px 6px",
        minWidth: "28px",
        height: "18px",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {badge.label}
    </span>
  );
}
