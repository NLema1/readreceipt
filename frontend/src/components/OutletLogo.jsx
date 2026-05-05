const OUTLET_META = {
  guardian:   { src: "/logos/guardian.svg",   title: "The Guardian" },
  bbc:        { src: "/logos/bbc.svg",        title: "BBC News" },
  npr:        { src: "/logos/npr.svg",        title: "NPR" },
  aljazeera:  { src: "/logos/aljazeera.svg",  title: "Al Jazeera English" },
  propublica: { src: "/logos/propublica.svg", title: "ProPublica" },
  nbc:        { src: "/logos/nbc.svg",        title: "NBC News" },
  cbs:        { src: "/logos/cbs.svg",        title: "CBS News" },
  thehill:    { src: "/logos/thehill.svg",    title: "The Hill" },
  sky:        { src: "/logos/sky.svg",        title: "Sky News" },
};

export default function OutletLogo({ outlet, size = "sm" }) {
  const meta = OUTLET_META[outlet];
  if (!meta) return null;
  const heights = { sm: 12, md: 14, lg: 18 };
  const px = heights[size] ?? heights.sm;
  return (
    <span
      title={meta.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: "3px",
        padding: "3px 5px",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <img
        src={meta.src}
        alt={meta.title}
        style={{ height: `${px}px`, width: "auto", display: "block" }}
      />
    </span>
  );
}
