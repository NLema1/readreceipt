export default function SearchBar({ value, onChange, isUrl }) {
  return (
    <div className="flex items-center gap-2 flex-1 max-w-xl">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a URL or search by headline…"
        className="flex-1 bg-panel border border-line rounded px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
      />
      {isUrl && (
        <span className="text-xs text-accent uppercase tracking-wide">URL</span>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-muted hover:text-text px-2"
        >
          clear
        </button>
      )}
    </div>
  );
}
