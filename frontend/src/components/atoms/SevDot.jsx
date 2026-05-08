import { RR } from "./tokens";

export default function SevDot({ s, size = 10 }) {
  const c =
    s >= 5 ? RR.redDeep :
    s >= 4 ? RR.red :
    s >= 3 ? RR.amber :
    RR.mute;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: c,
        verticalAlign: "middle",
      }}
    />
  );
}
