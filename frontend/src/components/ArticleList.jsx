import OutletLogo from "./OutletLogo";
import ScoreBadge from "./ScoreBadge";

export default function ArticleList({ articles, selectedId, onSelect, loading, error }) {
  if (loading && !articles) {
    return <div className="p-4 text-muted">Loading…</div>;
  }
  if (error) {
    return <div className="p-4 text-red-400">Error: {error.message}</div>;
  }
  if (!articles || articles.length === 0) {
    return (
      <div className="p-4 text-muted">
        No articles match your filters yet. New ones appear here as they publish.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {articles.map((a) => {
        const isSelected = a.id === selectedId;
        return (
          <li
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={
              "flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-panel/60 " +
              (isSelected ? "bg-panel" : "")
            }
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted">
                <OutletLogo outlet={a.outlet} />
              </div>
              <div className="text-sm text-text mt-2 leading-snug">
                {a.headline || a.url}
              </div>
            </div>
            <ScoreBadge
              severity={a.max_severity}
              changeCount={a.change_count}
              size="md"
            />
          </li>
        );
      })}
    </ul>
  );
}
