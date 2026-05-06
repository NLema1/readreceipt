import ReactDiffViewer from "react-diff-viewer-continued";

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const sharedDiffStyles = {
  variables: {
    dark: {
      diffViewerBackground: "transparent",
      diffViewerColor: "#e5e5e5",
      addedBackground: "rgba(34,197,94,0.10)",
      addedColor: "#bbf7d0",
      removedBackground: "rgba(239,68,68,0.12)",
      removedColor: "#fecaca",
      wordAddedBackground: "rgba(34,197,94,0.30)",
      wordRemovedBackground: "rgba(239,68,68,0.32)",
      gutterBackground: "transparent",
      gutterColor: "#525252",
      emptyLineBackground: "transparent",
      addedGutterBackground: "transparent",
      removedGutterBackground: "transparent",
      codeFoldGutterBackground: "transparent",
      codeFoldBackground: "transparent",
    },
  },
  contentText: {
    fontFamily:
      'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    fontSize: "12px",
  },
};

export default function DiffViewer({
  oldHeadline,
  newHeadline,
  oldBody,
  newBody,
  oldScrapedAt,
  newScrapedAt,
}) {
  return (
    <div className="font-mono text-xs">
      {/* Receipt-detail column headers */}
      <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] uppercase tracking-wider text-muted">
        <div className="border-b border-line pb-1">
          original · {fmtTime(oldScrapedAt)}
        </div>
        <div className="border-b border-line pb-1">
          current · {fmtTime(newScrapedAt)}
        </div>
      </div>

      {oldHeadline !== newHeadline && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
            headline
          </div>
          <ReactDiffViewer
            oldValue={oldHeadline}
            newValue={newHeadline}
            splitView={true}
            hideLineNumbers
            useDarkTheme
            compareMethod="diffWords"
            extraLinesSurroundingDiff={0}
            styles={sharedDiffStyles}
          />
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
          body
        </div>
        <ReactDiffViewer
          oldValue={oldBody}
          newValue={newBody}
          splitView={true}
          hideLineNumbers
          useDarkTheme
          compareMethod="diffWords"
          extraLinesSurroundingDiff={2}
          styles={sharedDiffStyles}
        />
      </div>
    </div>
  );
}
