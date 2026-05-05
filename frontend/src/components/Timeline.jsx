import ChangeNode from "./ChangeNode";
import Dot from "./Dot";

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

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-line">
        <div className="flex items-start gap-2">
          <BackButton />
          <h2 className="text-lg font-medium text-text flex-1">{article.headline || article.url}</h2>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline text-sm whitespace-nowrap"
          >
            open ↗
          </a>
        </div>
        <div className="text-xs text-muted mt-1 flex items-center gap-2">
          <span>{article.outlet}</span>
          <span>·</span>
          <span>tracked since {new Date(article.first_seen).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-line" />
        <ul>
          <li className="relative pl-10 pr-4 py-3">
            <span className="absolute left-4 top-5 -translate-x-1/2">
              <Dot changeType="other" severity={3} hollow />
            </span>
            <div className="text-sm text-muted">Now — current version</div>
          </li>

          {!hasChanges && (
            <li className="px-10 py-6 text-muted text-sm">
              No meaningful edits detected yet.
            </li>
          )}

          {article.changes.map((c) => (
            <ChangeNode
              key={c.id}
              change={c}
              fromVersion={versionsById[c.from_version_id]}
              toVersion={versionsById[c.to_version_id]}
            />
          ))}

          <li className="relative pl-10 pr-4 py-3">
            <span className="absolute left-4 top-5 -translate-x-1/2">
              <Dot changeType="other" severity={3} hollow />
            </span>
            <div className="text-sm text-muted">
              First published {new Date(article.versions[0]?.scraped_at).toLocaleString()}
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
