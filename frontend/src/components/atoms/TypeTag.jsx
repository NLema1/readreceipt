import { FONT } from "./tokens";
import { typeOf } from "./changeTypes";

export default function TypeTag({ type }) {
  const t = typeOf(type);
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.14em",
        fontWeight: 600,
        color: t.hue,
        textTransform: "uppercase",
      }}
    >
      {t.short}
    </span>
  );
}
