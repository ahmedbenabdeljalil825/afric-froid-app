/** Downsample ordered points for chart performance (keeps first, last, and spread). */
export function downsampleSeries<T extends { timestamp: number }>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]);
  }
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Merge DB samples with the latest MQTT value pinned to “now” inside the visible window. */
export function buildLineChartSeries(
  dbPoints: { timestamp: number; value: number }[] | undefined,
  liveValue: unknown,
  hours: number
): { timestamp: number; value: number }[] {
  const windowEnd = Date.now();
  const windowStart = windowEnd - hours * 3600 * 1000;
  const raw = [...(dbPoints || [])].filter(
    (p) =>
      p &&
      typeof p.timestamp === 'number' &&
      typeof p.value === 'number' &&
      !Number.isNaN(p.value) &&
      p.timestamp >= windowStart
  );
  raw.sort((a, b) => a.timestamp - b.timestamp);

  if (typeof liveValue === 'number' && !Number.isNaN(liveValue)) {
    const last = raw[raw.length - 1];
    if (!last || windowEnd - last.timestamp > 1500) {
      raw.push({ timestamp: windowEnd, value: liveValue });
    } else {
      raw[raw.length - 1] = { timestamp: windowEnd, value: liveValue };
    }
  }
  return raw;
}
