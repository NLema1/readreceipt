import { FONT, RR } from "./tokens";
import { OUTLETS } from "./outlets";

export default function OutletMark({
  outlet,
  height = 14,
  mono = false,
  withName = true,
}) {
  const o = OUTLETS[outlet];
  if (!o) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <img
        src={o.logo}
        alt={o.label}
        style={{
          height,
          width: "auto",
          maxWidth: 80,
          objectFit: "contain",
          filter: "grayscale(1) contrast(1.05)",
        }}
      />
      {withName && (
        <span
          style={{
            fontFamily: mono ? FONT.mono : FONT.sans,
            fontSize: 11,
            letterSpacing: mono ? "0.12em" : "0.02em",
            textTransform: mono ? "uppercase" : "none",
            color: RR.ink,
            fontWeight: 500,
          }}
        >
          {o.short}
        </span>
      )}
    </span>
  );
}
