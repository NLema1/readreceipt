import Dot from "./Dot";
import OutletLogo from "./OutletLogo";
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
              "px-4 py-4 cursor-pointer hover:bg-panel/60 " +
              (isSelected ? "bg-panel" : "")
            }
          >
            <div className="flex items-start gap-3">
              <Dot
                changeType={pickChangeTypeForRow(a)}
                severity={a.max_severity}
                hollow={a.change_count === 0}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <OutletLogo outlet={a.outlet} />
                  <span className="uppercase tracking-wide">
                    {OUTLET_LABELS[a.outlet] ?? a.outlet}
                  </span>
                  <span className="text-line">·</span>
                  <span>
                    {a.change_count} change{a.change_count === 1 ? "" : "s"}
                    {a.max_severity > 0 && <> · sev {a.max_severity}</>}
                  </span>
                </div>
                <div className="text-sm text-text mt-1 leading-snug">
                  {a.headline || a.url}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
