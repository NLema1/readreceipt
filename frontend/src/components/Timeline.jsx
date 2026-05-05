import { useState } from "react";
import ChangeNode from "./ChangeNode";
import Dot from "./Dot";
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from "../constants";

function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        className="w-full text-left px-4 py-2 text-xs uppercase tracking-wide text-muted hover:text-text"
        onClick={() => setOpen((v) => !v)}
      >
        Legend {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
          {Object.keys(CHANGE_TYPE_COLORS).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: CHANGE_TYPE_COLORS[k],
                  borderRadius: 9999,
                  display: "inline-block",
                }}
              />
              {CHANGE_TYPE_LABELS[k]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Timeline({ article, loading, error }) {
  if (loading && !article) {
    return <div className="p-4 text-muted">Loading…</div>;
  }
  if (error) {
    return <div className="p-4 text-red-400">Error: {error.message}</div>;
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
        <h2 className="text-lg font-medium text-text">{article.headline || article.url}</h2>
        <div className="text-xs text-muted mt-1 flex items-center gap-2">
          <span>{article.outlet}</span>
          <span>·</span>
          <span>tracked since {new Date(article.first_seen).toLocaleString()}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-accent hover:underline"
          >
            open ↗
          </a>
        </div>
      </div>
      <Legend />
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
