import { RR } from "./tokens";

export default function Sparkline({
  data,
  width = 120,
  height = 28,
  color = RR.ink,
  fill,
  strokeWidth = 1.5,
}) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} style={{ display: "block" }} />;
  }
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data
    .map((d, i) => `${i * step},${height - (d / max) * height}`)
    .join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && <polygon points={area} fill={fill} opacity="0.18" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}
