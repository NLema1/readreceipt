export default function Perf({ side = "top" }) {
  return <div className={side === "top" ? "perf-top" : "perf-bottom"} />;
}
