import OutletLogo from "./OutletLogo";
import { OUTLET_LABELS } from "../constants";

const OUTLETS = [
  "guardian", "bbc", "npr",
  "aljazeera", "propublica", "nbc", "cbs", "thehill", "sky",
  "fox", "nypost",
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
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-4 py-3 border-b border-line text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted whitespace-nowrap">Min severity</span>
        <input
          type="range"
          min="0"
          max="5"
          value={filters.minSeverity}
          onChange={(e) => setField("minSeverity", Number(e.target.value))}
          className="flex-1 md:flex-initial"
        />
        <span className="text-text w-4 text-center">{filters.minSeverity}</span>
      </label>
      <div className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory pb-1 md:pb-0">
        {OUTLETS.map((o) => {
          const active = filters.outlets.includes(o);
          return (
            <button
              key={o}
              onClick={() => toggleOutlet(o)}
              aria-label={OUTLET_LABELS[o]}
              aria-pressed={active}
              className={
                "p-1 rounded border transition-opacity flex-shrink-0 snap-start " +
                (active
                  ? "border-accent opacity-100"
                  : "border-line opacity-40 hover:opacity-100")
              }
            >
              <OutletLogo outlet={o} size="lg" />
            </button>
          );
        })}
      </div>
      <select
        className="bg-panel border border-line rounded px-2 py-1 text-text self-start md:self-auto"
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
