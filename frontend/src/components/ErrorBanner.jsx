import { RR } from "./atoms";

// Renders a thin red strip if any of the supplied query objects has its
// .error set. Use to surface usePolling failures so the UI doesn't silently
// sit on stale or empty data when the API is down.
export default function ErrorBanner({ queries }) {
  const failing = (queries || []).filter((q) => q?.error);
  if (failing.length === 0) return null;
  return (
    <div
      style={{
        padding: "8px 48px",
        background: `${RR.red}14`,
        borderBottom: `1px solid ${RR.red}`,
        color: RR.red,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      Connection issue — latest data may be missing. Retrying.
    </div>
  );
}
