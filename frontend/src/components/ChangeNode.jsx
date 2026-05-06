import { useState } from "react";
import DiffViewer from "./DiffViewer";
import { CHANGE_TYPE_SHORT_LABELS, SEVERITY_BADGE_COLORS } from "../constants";

function timeAgo(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChangeNode({ change, fromVersion, toVersion }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_BADGE_COLORS[change.severity] ?? SEVERITY_BADGE_COLORS[0];
  const label = CHANGE_TYPE_SHORT_LABELS[change.change_type] ?? change.change_type.toUpperCase();
  const showVibeShift = change.severity >= 3;

  return (
    <li className="font-mono text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "w-full text-left flex items-center gap-2 px-3 py-2 rounded " +
          "hover:bg-panel/60 transition-colors"
        }
      >
        <span className="text-text shrink-0 tracking-wide">{label}</span>
        <span
          className="flex-1 border-b border-dotted border-line/70 mb-1.5"
          aria-hidden="true"
        />
        <span className="text-muted text-xs whitespace-nowrap">
          {timeAgo(change.classified_at)}
        </span>
        <span className="text-muted">|</span>
        <span
          className="font-bold tabular-nums"
          style={{ color: sev.text }}
        >
          {sev.label}
        </span>
      </button>
      {open && fromVersion && toVersion && (
        <div className="px-3 pt-1 pb-4">
          {showVibeShift && change.summary && (
            <div
              className="mb-3 rounded border border-line bg-panel/80 p-3 text-xs"
              style={{ borderLeftWidth: "3px", borderLeftColor: sev.text }}
            >
              <div
                className="uppercase tracking-wider mb-1 font-bold"
                style={{ color: sev.text }}
              >
                Vibe shift
              </div>
              <div className="text-text font-sans leading-relaxed">
                {change.summary}
              </div>
            </div>
          )}
          <DiffViewer
            oldHeadline={fromVersion.headline}
            newHeadline={toVersion.headline}
            oldBody={fromVersion.body_text}
            newBody={toVersion.body_text}
            oldScrapedAt={fromVersion.scraped_at}
            newScrapedAt={toVersion.scraped_at}
          />
        </div>
      )}
    </li>
  );
}
