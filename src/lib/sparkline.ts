export interface SparklinePoint {
  year: number;
  value: number;
}

export interface Sparkline {
  linePath: string;
  areaPath: string;
  dots: { x: number; y: number }[];
  width: number;
  height: number;
}

/** value 0 → bottom edge, value 100 → top edge; X spread evenly across width. */
export function buildSparkline(
  points: SparklinePoint[],
  width = 640,
  height = 200,
  pad = 8,
): Sparkline {
  if (points.length < 2) {
    return { linePath: "", areaPath: "", dots: [], width, height };
  }
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const dots = points.map((p, i) => {
    const x = pad + (innerW * i) / (points.length - 1);
    const clamped = Math.max(0, Math.min(100, p.value));
    const y = pad + innerH * (1 - clamped / 100);
    return { x, y };
  });
  const linePath = dots
    .map((d, i) => `${i === 0 ? "M" : "L"}${d.x.toFixed(2)} ${d.y.toFixed(2)}`)
    .join(" ");
  const baseline = height - pad;
  const areaPath = `${linePath} L${dots[dots.length - 1].x.toFixed(2)} ${baseline.toFixed(
    2,
  )} L${dots[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`;
  return { linePath, areaPath, dots, width, height };
}
