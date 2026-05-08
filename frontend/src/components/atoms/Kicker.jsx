import { FONT, RR } from "./tokens";

export default function Kicker({ children, style, as: Tag = "div" }) {
  return (
    <Tag
      style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: RR.soft,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
