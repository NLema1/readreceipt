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
  fox:        { src: "/logos/fox.svg",        title: "Fox News" },
  nypost:     { src: "/logos/nypost.svg",     title: "New York Post" },
};

const SIZE_CONFIG = {
  sm: { height: 12, padX: 5, padY: 3, radius: 3 },
  md: { height: 14, padX: 6, padY: 4, radius: 3 },
  lg: { height: 22, padX: 9, padY: 6, radius: 4 },
  xl: { height: 28, padX: 11, padY: 7, radius: 5 },
};

export default function OutletLogo({ outlet, size = "sm" }) {
  const meta = OUTLET_META[outlet];
  if (!meta) return null;
  const cfg = SIZE_CONFIG[size] ?? SIZE_CONFIG.sm;
  return (
    <span
      title={meta.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: `${cfg.radius}px`,
        padding: `${cfg.padY}px ${cfg.padX}px`,
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <img
        src={meta.src}
        alt={meta.title}
        style={{ height: `${cfg.height}px`, width: "auto", display: "block" }}
      />
    </span>
  );
}
