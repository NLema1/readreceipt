import { FONT, RR } from "./tokens";

export default function SevPill({ s }) {
  const c =
    s >= 5 ? RR.redDeep :
    s >= 4 ? RR.red :
    s >= 3 ? RR.amber :
    RR.soft;
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.1em",
        fontWeight: 600,
        color: c,
        border: `1px solid ${c}`,
        padding: "2px 6px",
        borderRadius: 2,
        background: "transparent",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      S·{s}
    </span>
  );
}
