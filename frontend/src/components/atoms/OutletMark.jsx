import { FONT, RR } from "./tokens";
import { OUTLETS } from "./outlets";

export default function OutletMark({
  outlet,
  height = 14,
  mono = false,
  withName = true,
  logoBox, // when set: logo sits in a fixed-width slot so names align in lists
}) {
  const o = OUTLETS[outlet];
  if (!o) return null;
  const scale = o.scale ?? 1;
  const effectiveHeight = Math.round(height * scale);
  const baseImgStyle = {
    objectFit: "contain",
    filter: "grayscale(1) contrast(1.05)",
    display: "block",
  };
  const img = (
    <img
      src={o.logo}
      alt={o.label}
      style={
        logoBox
          ? { ...baseImgStyle, maxHeight: effectiveHeight, maxWidth: logoBox, width: "auto", height: "auto" }
          : { ...baseImgStyle, height: effectiveHeight, width: "auto" }
      }
    />
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {logoBox ? (
        <span
          style={{
            width: logoBox,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {img}
        </span>
      ) : (
        img
      )}
      {withName && (
        <span
          style={{
            fontFamily: mono ? FONT.mono : FONT.sans,
            fontSize: 11,
            letterSpacing: mono ? "0.12em" : "0.02em",
            textTransform: mono ? "uppercase" : "none",
            color: RR.ink,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {o.short}
        </span>
      )}
    </span>
  );
}
