/**
 * Tiny pure-function statistics helpers used by room's chart components.
 *
 * None of these allocate beyond what's strictly needed by the call, and all
 * three are exhaustively pure — no module-level state, no I/O — so they're
 * cheap to call once per render of a chart.
 */

/**
 * Returns the 0–100 percentile rank of `value` within `distribution`.
 *
 *   - 0 means `value` is at-or-below every observed value in the distribution.
 *   - 100 means `value` is at-or-above every observed value.
 *
 * Implementation: sort the distribution once (binary-insertion-search on
 * a presorted copy), then bin-search for `value`. NaN / null-like inputs
 * collapse to 0 so the gauge stays at the floor rather than glitching.
 */
export function percentileOfValue(
  distribution: number[],
  value: number,
): number {
  if (!distribution.length || !Number.isFinite(value)) return 0;

  const sorted = distribution
    .filter((n) => Number.isFinite(n))
    .slice()
    .sort((a, b) => a - b);

  if (!sorted.length) return 0;

  // Binary search for the first index >= value. Position counts items
  // strictly below `value`, which is the standard "less-than" rank.
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }

  return Math.round((lo / sorted.length) * 100);
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  /** Coefficient of determination — 1.0 = perfect fit, 0 = no relationship. */
  r2: number;
}

/**
 * Ordinary least-squares regression. Degenerate inputs (zero variance, empty
 * arrays, mismatched lengths) collapse to a flat line at the mean of `ys`
 * with r² of 0 — safe to plot, harmless to read.
 */
export function linearRegression(
  xs: number[],
  ys: number[],
): LinearRegressionResult {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  let totalSS = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    den += dx * dx;
    totalSS += dy * dy;
  }

  if (den === 0) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = num / den;
  const intercept = meanY - slope * meanX;

  let resSS = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    const r = ys[i] - predicted;
    resSS += r * r;
  }
  const r2 = totalSS === 0 ? 0 : 1 - resSS / totalSS;

  return { slope, intercept, r2 };
}

/**
 * Human reading of a 0–100 percentile rank, e.g. "82% of comparable parcels
 * are utilised more intensively." For v1 we only ship the English string —
 * non-English locales receive the same English text. TODO(locale): translate.
 */
export function humanPercentileReading(
  percentile: number,
  _locale: 'en' | 'de' | 'fr' | 'it',
): string {
  const p = Math.max(0, Math.min(100, Math.round(percentile)));
  const moreIntensive = 100 - p;
  // TODO(locale): full localisation. For now English-only — non-English
  // callers receive the English copy. Keeping the locale arg keeps the API
  // forward-compatible without forcing callers to change later.
  if (p === 100) {
    return 'This parcel is the most intensively utilised in the zone.';
  }
  if (p === 0) {
    return 'This parcel is the least intensively utilised in the zone.';
  }
  if (p >= 50) {
    return `${moreIntensive}% of comparable parcels are utilised more intensively.`;
  }
  return `${p}% of comparable parcels are utilised less intensively.`;
}
