export default function Barcode({ seed = "0a4f", height = 38 }) {
  const widths = [];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = s * 31 + seed.charCodeAt(i);
  for (let i = 0; i < 56; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const w = 1 + (s % 4);
    widths.push(w);
  }
  return (
    <div className="barcode" style={{ height }}>
      {widths.map((w, i) => (
        <i key={i} style={{ width: `${w}px`, opacity: i % 5 === 0 ? 0.5 : 1 }} />
      ))}
    </div>
  );
}
