export default function LeaderRow({ label, value, valueMuted = false }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      <span className="leader" />
      <span className={"value" + (valueMuted ? " muted" : "")}>{value}</span>
    </div>
  );
}
