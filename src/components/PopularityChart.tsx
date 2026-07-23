import { buildSparkline } from "@/lib/sparkline";
import type { DossierPopularityPointView } from "@/lib/dossiers";

export default function PopularityChart({
  points,
}: {
  points: DossierPopularityPointView[];
}) {
  const s = buildSparkline(points, 640, 200, 10);
  if (!s.linePath) return null;
  return (
    <svg
      viewBox={`0 0 ${s.width} ${s.height}`}
      className="h-auto w-full"
      role="img"
      aria-label="popularity over time"
    >
      <defs>
        <linearGradient id="popFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B85450" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#B85450" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={s.areaPath} fill="url(#popFill)" />
      <path d={s.linePath} fill="none" stroke="#CA6E6A" strokeWidth="2" />
      {s.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3" fill="#CA6E6A" />
      ))}
      {points.map((p, i) => (
        <text
          key={i}
          x={s.dots[i].x}
          y={s.height - 2}
          textAnchor="middle"
          className="fill-tx3 font-mono"
          fontSize="9"
        >
          {p.year}
        </text>
      ))}
    </svg>
  );
}
