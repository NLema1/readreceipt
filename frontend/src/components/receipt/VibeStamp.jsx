export default function VibeStamp({
  severity,
  summary,
  source = "CLF · CLAUDE-HAIKU-4.5",
  time = "",
  block = false,
  maxWidth,
}) {
  const headLabel =
    severity >= 4 ? "★ VIBE SHIFT DETECTED ★" : "★ VIBE SHIFT ★";
  return (
    <div
      className="vibe-stamp"
      style={{
        display: block ? "block" : "inline-block",
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      <div className="vibe-head">
        <span>{headLabel}</span>
        <span style={{ fontSize: 9 }}>{`SEV·${severity} ↑ INTENSIFIED`}</span>
      </div>
      <div className="vibe-body">{summary}</div>
      <div className="vibe-foot">
        <span>{source}</span>
        {time && <span>{time}</span>}
      </div>
    </div>
  );
}
