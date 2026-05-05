import ReactDiffViewer from "react-diff-viewer-continued";

export default function DiffViewer({ oldHeadline, newHeadline, oldBody, newBody }) {
  return (
    <div className="space-y-4 mt-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted mb-1">Headline</div>
        <ReactDiffViewer
          oldValue={oldHeadline}
          newValue={newHeadline}
          splitView={false}
          hideLineNumbers
          useDarkTheme
          compareMethod="diffWords"
        />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted mb-1">Body</div>
        <ReactDiffViewer
          oldValue={oldBody}
          newValue={newBody}
          splitView={false}
          hideLineNumbers
          useDarkTheme
          compareMethod="diffWords"
        />
      </div>
    </div>
  );
}
