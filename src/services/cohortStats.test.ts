import { describe, it, expect } from 'vitest';
import { parcelRatioV, ratioVHeadline } from './cohortStats';
import type { ZoneStatsResponse, ZoneParcel } from './zoneStatsService';

/**
 * Fixture shaped like the live payload: ratioV is `K * volume / area` for one
 * zone constant, `age_cohorts` carries only means + counts, `parcels[]` only
 * area/volume/year — exactly the gap `cohortStats` closes.
 */
const K = 58;
const REF_YEAR = 2026;

function parcel(year: number | null, ratioV: number): ZoneParcel {
  // area fixed at 1000 m²; volume back-solved so K * volume / area === ratioV.
  const area = 1000;
  return { egrid: `E${year}-${ratioV}`, area, volume: (ratioV * area) / K, year };
}

/** Built inside the last-5 window (>= REF_YEAR - 5), i.e. 2021 and later. */
const RECENT = [40, 60, 80, 100, 200].map((r, i) => parcel(2021 + i, r));
/** Built long before it. */
const OLD = [10, 20, 30, 300].map((r, i) => parcel(1970 + i, r));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function makeStats(parcels: ZoneParcel[], recent: ZoneParcel[]): ZoneStatsResponse {
  const ratioOf = (p: ZoneParcel) => (K * p.volume) / p.area;
  const all = parcels.map(ratioOf);
  const cohort = recent.map(ratioOf);
  return {
    zone: { fso: 1, municipality_name: 'Z', cz_local: 'W2', cz_canton: 'W2', parcel_count: parcels.length },
    other_zones: [],
    distributions: {
      // Deliberately NOT the same set as `summary` — the live payload trims
      // this one, and the code must not read percentiles off it.
      ratio_v: all.slice(1),
      free_v: [],
      ratio_s: [],
      gfz: [],
      bldg_height_m: [],
      bldg_floors_n: [],
    },
    summary: {
      ratio_v: {
        min: Math.min(...all),
        max: Math.max(...all),
        p5: 0,
        p25: 0,
        p50: 55,
        p75: 0,
        p95: 0,
        mean: mean(all),
        n: all.length,
      },
      free_v: emptySummary(),
      ratio_s: emptySummary(),
      gfz: emptySummary(),
      bldg_height_m: emptySummary(),
      bldg_floors_n: emptySummary(),
    },
    age_cohorts: {
      now: { cohort_label: 'All years', mean_ratio_v: mean(all), n: all.length },
      last60: { cohort_label: 'Last 60 years', mean_ratio_v: null, n: 0 },
      last40: { cohort_label: 'Last 40 years', mean_ratio_v: null, n: 0 },
      last20: { cohort_label: 'Last 20 years', mean_ratio_v: null, n: 0 },
      last5: cohort.length
        ? { cohort_label: 'Last 5 years', mean_ratio_v: mean(cohort), n: cohort.length }
        : { cohort_label: 'Last 5 years', mean_ratio_v: null, n: 0 },
    },
    parcels,
  };
}

function emptySummary() {
  return { min: 0, max: 0, p5: 0, p25: 0, p50: 0, p75: 0, p95: 0, mean: 0, n: 0 };
}

describe('parcelRatioV', () => {
  it('recovers each parcel\'s ratioV from area, volume and the all-years mean', () => {
    const stats = makeStats([...OLD, ...RECENT], RECENT);
    const got = parcelRatioV(stats).map((v) => Math.round(v));
    expect(got).toEqual([10, 20, 30, 300, 40, 60, 80, 100, 200]);
  });

  it('gives up rather than guess when the payload cannot pin the constant', () => {
    const stats = makeStats([...OLD, ...RECENT], RECENT);
    expect(parcelRatioV({ ...stats, parcels: [] })).toEqual([]);
    expect(
      parcelRatioV({
        ...stats,
        age_cohorts: { ...stats.age_cohorts, now: { cohort_label: 'All years', mean_ratio_v: null, n: 0 } },
      }),
    ).toEqual([]);
  });
});

describe('ratioVHeadline', () => {
  it('describes the LAST FIVE YEARS, not the whole zone', () => {
    const stats = makeStats([...OLD, ...RECENT], RECENT);
    const head = ratioVHeadline(stats, REF_YEAR);
    expect(head).not.toBeNull();
    expect(head!.scope).toBe('last5');
    expect(head!.n).toBe(5);
    // Cohort is 40/60/80/100/200: mean 96, p50 80, p80 (linear) 120.
    expect(head!.mean).toBeCloseTo(96, 6);
    expect(head!.p50).toBeCloseTo(80, 6);
    expect(head!.p80).toBeCloseTo(120, 6);
    // The whole-zone figures it must NOT be showing.
    expect(head!.mean).not.toBeCloseTo(stats.summary.ratio_v.mean, 3);
  });

  it('still resolves when the client is a year off RES around New Year', () => {
    const stats = makeStats([...OLD, ...RECENT], RECENT);
    // RES built the cohort with 2026; the browser already says 2027.
    const head = ratioVHeadline(stats, REF_YEAR + 1);
    expect(head!.scope).toBe('last5');
    expect(head!.n).toBe(5);
  });

  it('falls back to the whole zone when the window has no parcels', () => {
    const stats = makeStats(OLD, []);
    const head = ratioVHeadline(stats, REF_YEAR);
    expect(head!.scope).toBe('all');
    expect(head!.n).toBe(OLD.length);
    expect(head!.mean).toBeCloseTo(stats.summary.ratio_v.mean, 6);
    expect(head!.p50).toBe(55); // RES's own p50, not one recomputed off a trimmed array
    expect(head!.p80).toBeCloseTo(138, 6); // p80 (linear) of 10/20/30/300
  });

  it('falls back rather than trust a cohort it cannot reproduce', () => {
    const stats = makeStats([...OLD, ...RECENT], RECENT);
    // RES claims a different membership than parcels[].year supports.
    const skewed: ZoneStatsResponse = {
      ...stats,
      age_cohorts: {
        ...stats.age_cohorts,
        last5: { cohort_label: 'Last 5 years', mean_ratio_v: 96, n: 4 },
      },
    };
    expect(ratioVHeadline(skewed, REF_YEAR)!.scope).toBe('all');

    // Right count, mean nowhere near what the parcels imply.
    const drifted: ZoneStatsResponse = {
      ...stats,
      age_cohorts: {
        ...stats.age_cohorts,
        last5: { cohort_label: 'Last 5 years', mean_ratio_v: 500, n: 5 },
      },
    };
    expect(ratioVHeadline(drifted, REF_YEAR)!.scope).toBe('all');
  });

  it('is null only when the zone has no parcels at all', () => {
    const stats = makeStats(OLD, []);
    const empty: ZoneStatsResponse = {
      ...stats,
      parcels: [],
      summary: { ...stats.summary, ratio_v: emptySummary() },
    };
    expect(ratioVHeadline(empty, REF_YEAR)).toBeNull();
  });
});
