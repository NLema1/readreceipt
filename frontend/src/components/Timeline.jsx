import ChangeNode from "./ChangeNode";
import OutletLogo from "./OutletLogo";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Timeline({ article, loading, error, onClose }) {
  function BackButton() {
    if (!onClose) return null;
    return (
      <button
        onClick={onClose}
        className="md:hidden text-text px-2 py-1 -ml-2 hover:bg-panel rounded"
        aria-label="Back to article list"
      >
        ←
      </button>
    );
  }

  if (loading && !article) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-line flex items-center gap-2 md:hidden">
          <BackButton />
        </div>
        <div className="p-4 text-muted">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-line flex items-center gap-2 md:hidden">
          <BackButton />
        </div>
        <div className="p-4 text-red-400">Error: {error.message}</div>
      </div>
    );
  }
  if (!article) {
    return (
      <div className="p-8 text-muted text-center">
        Select an article to see its timeline.
      </div>
    );
  }

  const versionsById = Object.fromEntries(article.versions.map((v) => [v.id, v]));
  const hasChanges = article.changes.length > 0;
  const totalSeverity = article.changes.reduce((s, c) => s + (c.severity ?? 0), 0);
  const maxSeverity = article.changes.reduce((m, c) => Math.max(m, c.severity ?? 0), 0);
  // "Tracked since" reflects when our actual data starts (earliest stored version),
  // not when the URL was first discovered — the latter can predate a history reset.
  const earliestVersionAt = article.versions[0]?.scraped_at ?? article.first_seen;

  return (
    <div className="h-full flex flex-col">
      {/* Receipt header */}
      <div className="px-5 py-4 border-b border-dashed border-line">
        <div className="flex items-center gap-2 mb-3">
          <BackButton />
          <OutletLogo outlet={article.outlet} size="lg" />
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-accent hover:underline text-sm whitespace-nowrap font-mono"
          >
            view source ↗
          </a>
        </div>
        <h2 className="text-lg font-medium text-text leading-snug">
          {article.headline || article.url}
        </h2>
        <div className="font-mono text-xs text-muted mt-3 flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span>TRACKED SINCE</span>
            <span className="text-text">{fmtDate(earliestVersionAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>VERSIONS LOGGED</span>
            <span className="text-text">{article.versions.length}</span>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-auto">
        {!hasChanges ? (
          <div className="px-5 py-12 text-muted text-sm font-mono text-center">
            no changes detected yet —
            <br />
            we'll log them here as they happen
          </div>
        ) : (
          <ul className="px-2 py-2">
            {article.changes.map((c) => (
              <ChangeNode
                key={c.id}
                change={c}
                fromVersion={versionsById[c.from_version_id]}
                toVersion={versionsById[c.to_version_id]}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Audit total footer */}
      {hasChanges && (
        <div className="border-t border-dashed border-line px-5 py-4 font-mono text-xs">
          <div className="border-t border-line pt-3 space-y-1">
            <div className="flex justify-between text-muted">
              <span>CHANGES</span>
              <span className="text-text">{article.changes.length}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>MAX SEVERITY</span>
              <span className="text-text">S{maxSeverity}</span>
            </div>
            <div className="flex justify-between text-text font-bold pt-2 border-t border-line text-sm">
              <span>VOLATILITY</span>
              <span>{totalSeverity}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
