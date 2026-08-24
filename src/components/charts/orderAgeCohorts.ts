import type {
  ZoneAgeCohort,
  ZoneStatsResponse,
} from '../../services/zoneStatsService';

type AgeCohorts = ZoneStatsResponse['age_cohorts'];
type CohortKey = keyof AgeCohorts;

/**
 * Plot order for the utilisation ladder: WIDEST window first, narrowest last.
 *
 * This reverses the original direction (ALL / 20 / 40 / 60) deliberately. The
 * chart is titled "utilization over time", and putting the oldest-inclusive
 * window on the right ran the x-axis backwards in time: a zone that had been
 * densifying drew as a falling line. Widest-first means moving right narrows
 * the window to more recent construction, so a densifying zone now reads as a
 * rising line and the reader's left-to-right instinct is correct.
 *
 * The three narrow steps (15 / 10 / 5) are optional in the payload, so this
 * list is a superset of what any single response may carry.
 */
const COHORT_ORDER: CohortKey[] = [
  'now',
  'last60',
  'last40',
  'last20',
  'last15',
  'last10',
  'last5',
];

/**
 * Order the cohorts widest-window-first, skipping every key the payload does
 * not carry.
 *
 * The skip matters: a four-cohort payload restored from a cache written before
 * the seven-step ladder would otherwise yield three `{ cohort }` objects whose
 * `cohort_label`, `mean_ratio_v` and `n` are all `undefined` — three phantom
 * points the chart cannot even gap. Four real points is the correct reading of
 * a four-cohort payload.
 */
export function orderAgeCohorts(
  ageCohorts: AgeCohorts,
): Array<ZoneAgeCohort & { cohort: CohortKey }> {
  return COHORT_ORDER.flatMap((cohort) => {
    const entry = ageCohorts?.[cohort];
    return entry ? [{ ...entry, cohort }] : [];
  });
}

/**
 * Tick label for one cohort, derived from the KEY rather than the API's
 * `cohort_label`.
 *
 * RES ships English strings ('All years', 'Last 20 years', …) whatever the
 * requested language, and seven of them do not fit across a 400 px panel. The
 * bare window length is locale-neutral and ~4x narrower; the unit lives once
 * in the section subtitle. Returns `null` for the all-years baseline, which
 * has no number and needs the caller's translated "ALL".
 */
export function cohortTickYears(cohort: CohortKey): string | null {
  return cohort === 'now' ? null : cohort.replace('last', '');
}

/**
 * Dot radius band for a cohort's sample size.
 *
 * The ladder's whole point is precision, and precision is not free: measured
 * across 200 zones the mean cohort falls from ~1,600 parcels (all years) to
 * ~9 (last 5 years). A 5-year mean over a handful of parcels must not draw
 * with the same authority as one over hundreds, so the dot shrinks with `n`.
 * Bands, not a continuous scale — four sizes read as "thinner evidence", a
 * smooth ramp just reads as noise. `n` is also spelled out in the tooltip;
 * this is the at-a-glance version of the same fact.
 */
export function sampleSizeDotRadius(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 2;
  if (n >= 200) return 4.5;
  if (n >= 50) return 3.5;
  if (n >= 10) return 2.75;
  return 2;
}
