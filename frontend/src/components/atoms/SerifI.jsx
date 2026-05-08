import { FONT, RR } from "./tokens";

export default function SerifI({ children, style, as: Tag = "span" }) {
  return (
    <Tag
      style={{
        fontFamily: FONT.serif,
        fontStyle: "italic",
        color: RR.ink,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
