import { FONT, RR } from "./tokens";

export default function Mono({ children, style, as: Tag = "span" }) {
  return (
    <Tag
      style={{
        fontFamily: FONT.mono,
        fontSize: 11,
        color: RR.ink,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
