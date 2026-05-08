import { FONT, RR } from "./tokens";

export default function Diff({ oldText, newText, size = 18 }) {
  return (
    <div style={{ fontFamily: FONT.serif, fontSize: size, lineHeight: 1.3 }}>
      <div
        style={{
          color: RR.soft,
          textDecoration: "line-through",
          textDecorationColor: RR.red,
          textDecorationThickness: 1.5,
        }}
      >
        {oldText}
      </div>
      <div
        style={{
          color: RR.ink,
          marginTop: 4,
          borderBottom: `2px solid ${RR.green}`,
          display: "inline-block",
          paddingBottom: 1,
        }}
      >
        {newText}
      </div>
    </div>
  );
}
