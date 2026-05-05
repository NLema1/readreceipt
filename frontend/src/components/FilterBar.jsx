import OutletLogo from "./OutletLogo";
import { OUTLET_LABELS } from "../constants";

const OUTLETS = [
  "guardian", "bbc", "npr",
  "aljazeera", "propublica", "nbc", "cbs", "thehill", "sky",
];

export default function FilterBar({ filters, onChange }) {
  function setField(field, value) {
    onChange({ ...filters, [field]: value });
  }
  function toggleOutlet(o) {
    const set = new Set(filters.outlets);
    set.has(o) ? set.delete(o) : set.add(o);
    setField("outlets", [...set]);
  }
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-line text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted">Min severity</span>
        <input
          type="range"
          min="0"
          max="5"
          value={filters.minSeverity}
          onChange={(e) => setField("minSeverity", Number(e.target.value))}
        />
        <span className="text-text w-4 text-center">{filters.minSeverity}</span>
      </label>
      <div className="flex gap-1">
        {OUTLETS.map((o) => {
          const active = filters.outlets.includes(o);
          return (
            <button
              key={o}
              onClick={() => toggleOutlet(o)}
              aria-label={OUTLET_LABELS[o]}
              aria-pressed={active}
              className={
                "p-1 rounded border transition-opacity " +
                (active
                  ? "border-accent opacity-100"
                  : "border-line opacity-40 hover:opacity-100")
              }
            >
              <OutletLogo outlet={o} size="md" />
            </button>
          );
        })}
      </div>
      <select
        className="bg-panel border border-line rounded px-2 py-0.5 text-text"
        value={filters.window}
        onChange={(e) => setField("window", e.target.value)}
      >
        <option value="24h">Last 24h</option>
        <option value="7d">Last 7d</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}
