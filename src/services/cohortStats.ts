/**
 * Headline ratioV figures for the AGE COHORT the Zone tab leads with — the
 * parcels built in the last five years, not the whole zone.
 *
 * ## Why this file exists
 *
 * RES `/zone_stats` reports the zone two ways and they do not overlap:
 *
 *   - `summary.ratio_v` — min/max/p5/p25/p50/p75/p95/mean over EVERY parcel in
 *     the zone, no matter when it was built. No p80, and no way to narrow it.
 *   - `age_cohorts.{now,last60,…,last5}` — one MEAN and one count per window.
 *     No percentiles at all.
 *
 * The pills under the zone picker used to read straight off `summary`, so they
 * described a zone as its whole building stock — decades of it — while the
 * chart directly below them plotted the last-5-years cohort at a completely
 * different level. Same panel, two answers to "what is normal here?".
 *
 * ## How the cohort percentiles are recovered
 *
 * `parcels[]` carries `{ area, volume, year }` but no ratioV, so the cohort's
 * p50/p80 are not in the payload. They are still fully determined by it:
 * ratioV is built volume over ALLOWED volume, and the allowance is a fixed
 * rate per m² of parcel area within one zone, so
 *
 *     ratio_v(parcel) = k · volume / area
 *
 * for a single unknown k per zone. One equation fixes it — the all-years
 * cohort mean RES already sends:
 *
 *     k = age_cohorts.now.mean_ratio_v / mean(volume / area)
 *
 * Measured against the live endpoint (Grenchen 2546 / "Wohnzone, Bauklasse 3",
 * n=915), the ratioV reconstructed this way reproduces the payload's OWN
 * `summary` block to the float32 rounding of the wire format — p25 67.801 vs
 * 67.8, p50 95.553 vs 95.6, p75 137.169 vs 137.15, p95 213.926 vs 213.92,
 * mean and n exact — and every one of the six cohort means to within 0.01%.
 *
 * ## The guard
 *
 * The reconstruction is only trusted when it can be CHECKED. `ratioVHeadline`
 * re-derives the cohort from `parcels[].year` and uses it only if the parcel
 * count matches RES's own `n` for that window exactly and the reconstructed
 * mean lands within 2% of RES's. If RES ever redefines the window or the
 * formula, both tests fail and the pills fall back to the whole-zone figures
 * (correctly labelled as such) instead of printing a confident wrong number.
 */
import { quantile } from './statsMath';
import type { ZoneStatsResponse } from './zoneStatsService';

/** Window the headline pills describe, so the UI can label them honestly. */
export type RatioVScope = 'last5' | 'all';

export interface RatioVHeadline {
  scope: RatioVScope;
  /** Parcels the figures are computed over. */
  n: number;
  mean: number;
  p50: number;
  /** `null` only when the payload carries no usable `parcels[]` to derive it. */
  p80: number | null;
}

/** Cohort window, in years back from the reference year. Matches RES. */
const COHORT_YEARS = 5;
/** Reconstructed-vs-reported cohort mean must agree this closely. */
const MEAN_TOLERANCE = 0.02;

/**
 * Per-parcel ratioV, reconstructed as `k · volume / area` (see the file
 * header). Empty when the payload cannot pin `k` down — no all-years cohort
 * mean, or no parcel with a usable area.
 */
export function parcelRatioV(stats: ZoneStatsResponse): number[] {
  const allYearsMean = stats.age_cohorts?.now?.mean_ratio_v;
  if (allYearsMean == null || !Number.isFinite(allYearsMean)) return [];

  const usable = (stats.parcels ?? []).filter(
    (p) => Number.isFinite(p.area) && p.area > 0 && Number.isFinite(p.volume),
  );
  if (!usable.length) return [];

  const densities = usable.map((p) => p.volume / p.area);
  const meanDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
  if (!Number.isFinite(meanDensity) || meanDensity === 0) return [];

  const k = allYearsMean / meanDensity;
  return densities.map((d) => k * d);
}

/**
 * The three figures the pills show, for the last-5-years cohort where the
 * payload supports it and for the whole zone where it does not.
 *
 * `referenceYear` exists for the tests and for the New Year edge: RES applies
 * the window with its own clock, so around the turn of the year the client can
 * be one year out. Both candidates are tried and the one whose parcel count
 * matches RES's `n` wins; if neither does, the fallback takes over.
 */
export function ratioVHeadline(
  stats: ZoneStatsResponse,
  referenceYear: number = new Date().getFullYear(),
): RatioVHeadline | null {
  const derived = parcelRatioV(stats);
  const cohort = stats.age_cohorts?.last5;
  const parcels = (stats.parcels ?? []).filter(
    (p) => Number.isFinite(p.area) && p.area > 0 && Number.isFinite(p.volume),
  );

  if (derived.length === parcels.length && cohort?.n && cohort.mean_ratio_v != null) {
    for (const year of [referenceYear, referenceYear - 1]) {
      const cutoff = year - COHORT_YEARS;
      const values = derived.filter((_, i) => {
        const y = parcels[i].year;
        return y != null && Number.isFinite(y) && y >= cutoff;
      });
      if (values.length !== cohort.n) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const drift = Math.abs(mean - cohort.mean_ratio_v) / Math.abs(cohort.mean_ratio_v || 1);
      if (drift > MEAN_TOLERANCE) continue;

      return {
        scope: 'last5',
        n: cohort.n,
        // RES's own number for the figure RES publishes; the reconstruction
        // only has to supply what it does not.
        mean: cohort.mean_ratio_v,
        p50: quantile(values, 0.5) ?? mean,
        p80: quantile(values, 0.8),
      };
    }
  }

  const summary = stats.summary?.ratio_v;
  if (!summary?.n) return null;
  return {
    scope: 'all',
    n: summary.n,
    mean: summary.mean,
    p50: summary.p50,
    // `distributions.ratio_v` is trimmed server-side, so it is NOT the set
    // `summary` describes and a p80 off it would not sit with the p50 beside
    // it. The reconstruction is the same set; without it, no p80.
    p80: derived.length ? quantile(derived, 0.8) : null,
  };
}
