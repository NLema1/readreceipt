import { RR } from "./tokens";

export default function Hair({ style, dashed }) {
  return (
    <div
      style={{
        height: 1,
        background: dashed
          ? `repeating-linear-gradient(90deg,${RR.hair2} 0 4px,transparent 4px 8px)`
          : RR.hair,
        ...style,
      }}
    />
  );
}
