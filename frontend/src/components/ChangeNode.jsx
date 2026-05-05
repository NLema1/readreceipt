import { useState } from "react";
import Dot from "./Dot";
import DiffViewer from "./DiffViewer";
import { CHANGE_TYPE_LABELS } from "../constants";

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
  return (
    <li className="relative pl-10 pr-4 py-3">
      <span className="absolute left-4 top-5 -translate-x-1/2">
        <Dot changeType={change.change_type} severity={change.severity} />
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-left w-full"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-text text-sm font-medium">
            {CHANGE_TYPE_LABELS[change.change_type] ?? change.change_type}
          </span>
          <span className="text-xs text-muted">
            severity {change.severity} · {timeAgo(change.classified_at)}
          </span>
        </div>
        <div className="text-sm text-muted mt-1">{change.summary}</div>
      </button>
      {open && fromVersion && toVersion && (
        <DiffViewer
          oldHeadline={fromVersion.headline}
          newHeadline={toVersion.headline}
          oldBody={fromVersion.body_text}
          newBody={toVersion.body_text}
        />
      )}
    </li>
  );
}
