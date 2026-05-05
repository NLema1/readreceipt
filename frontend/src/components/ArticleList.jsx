import Dot from "./Dot";
import { OUTLET_LABELS } from "../constants";

function pickChangeTypeForRow(article) {
  if (article.max_severity > 0 && article.change_count > 0) {
    return "fact_change";
  }
  return "other";
}

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
        Watching feeds. New articles will appear here as they publish.
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
              "px-4 py-3 cursor-pointer hover:bg-panel/60 " +
              (isSelected ? "bg-panel" : "")
            }
          >
            <div className="flex items-center gap-3">
              <Dot
                changeType={pickChangeTypeForRow(a)}
                severity={a.max_severity}
                hollow={a.change_count === 0}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted">
                  {OUTLET_LABELS[a.outlet] ?? a.outlet}
                </div>
                <div className="text-sm text-text truncate">{a.headline || a.url}</div>
                <div className="text-xs text-muted mt-1">
                  {a.change_count} change{a.change_count === 1 ? "" : "s"}
                  {a.max_severity > 0 && <> · sev {a.max_severity}</>}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
