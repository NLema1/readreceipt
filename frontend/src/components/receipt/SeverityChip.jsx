export default function SeverityChip({ s, style }) {
  return <span className={`sev sev-${s}`} style={style}>{`S·${s}`}</span>;
}
