import { CHANGE_TYPE_COLORS, SEVERITY_SIZES } from "../constants";

export default function Dot({ changeType, severity, hollow = false }) {
  const size = SEVERITY_SIZES[severity] ?? 9;
  const color = CHANGE_TYPE_COLORS[changeType] ?? "#737373";
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    background: hollow ? "transparent" : color,
    border: hollow ? `2px solid ${color}` : "none",
    flexShrink: 0,
  };
  return <span style={style} aria-hidden="true" />;
}
