export default function VolatilityBar({ value, max = 50 }) {
  const segs = 20;
  const filled = Math.round((value / max) * segs);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: segs }).map((_, i) => {
        const on = i < filled;
        const sev = i < 8 ? "var(--ink)" : i < 14 ? "var(--amber)" : "var(--red)";
        return (
          <span
            key={i}
            style={{
              width: 6,
              height: 14,
              background: on ? sev : "transparent",
              border: `1.2px solid ${on ? sev : "var(--ink-faded)"}`,
            }}
          />
        );
      })}
    </div>
  );
}
