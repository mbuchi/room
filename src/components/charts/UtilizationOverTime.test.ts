import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  cohortTickYears,
  orderAgeCohorts,
  sampleSizeDotRadius,
} from './orderAgeCohorts';
import type { ZoneStatsResponse } from '../../services/zoneStatsService';

type AgeCohorts = ZoneStatsResponse['age_cohorts'];

// Build the cohorts in the raw payload order RES happens to emit, scrambled
// against the plot order, so the test proves orderAgeCohorts re-orders them
// rather than preserving the order it happens to receive.
const cohorts: AgeCohorts = {
  last5: { cohort_label: 'Last 5 years', mean_ratio_v: 0.9, n: 8 },
  last60: { cohort_label: 'Last 60 years', mean_ratio_v: 0.4, n: 900 },
  last15: { cohort_label: 'Last 15 years', mean_ratio_v: 0.75, n: 40 },
  last40: { cohort_label: 'Last 40 years', mean_ratio_v: 0.5, n: 600 },
  now: { cohort_label: 'All years', mean_ratio_v: 0.3, n: 1600 },
  last10: { cohort_label: 'Last 10 years', mean_ratio_v: 0.8, n: 20 },
  last20: { cohort_label: 'Last 20 years', mean_ratio_v: 0.6, n: 120 },
};

/** What a payload restored from a cache written before the ladder looks like. */
const legacyCohorts: AgeCohorts = {
  last60: { cohort_label: 'Last 60 years', mean_ratio_v: 0.4, n: 900 },
  last40: { cohort_label: 'Last 40 years', mean_ratio_v: 0.5, n: 600 },
  last20: { cohort_label: 'Last 20 years', mean_ratio_v: 0.6, n: 120 },
  now: { cohort_label: 'All years', mean_ratio_v: 0.3, n: 1600 },
};

const chart = readFileSync(new URL('./UtilizationOverTime.tsx', import.meta.url), 'utf8');
const i18n = readFileSync(new URL('../../contexts/I18nContext.tsx', import.meta.url), 'utf8');

const LOCALES = ['en', 'fr', 'de', 'it'] as const;

/** Slice out one locale's dictionary block, as the panel-tab suite does. */
function localeBlock(locale: string): string {
  const start = i18n.indexOf(`\n  ${locale}: {`);
  expect(start, `${locale} dictionary missing`).toBeGreaterThan(-1);
  const next = LOCALES.map((l) => i18n.indexOf(`\n  ${l}: {`))
    .filter((i) => i > start)
    .sort((a, b) => a - b)[0];
  return i18n.slice(start, next === undefined ? i18n.length : next);
}

describe('orderAgeCohorts', () => {
  it('plots the seven-step ladder widest window first, narrowest last', () => {
    // Widest-first is the point: moving right narrows the window to more
    // recent construction, so a densifying zone reads as a rising line.
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered.map((c) => c.cohort)).toEqual([
      'now',
      'last60',
      'last40',
      'last20',
      'last15',
      'last10',
      'last5',
    ]);
  });

  it('keeps each cohort payload aligned with its window', () => {
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered.map((c) => c.mean_ratio_v)).toEqual([0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 0.9]);
    expect(ordered.map((c) => c.n)).toEqual([1600, 900, 600, 120, 40, 20, 8]);
  });

  it('carries the cohort payload through unchanged', () => {
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered[0]).toMatchObject({
      cohort: 'now',
      cohort_label: 'All years',
      mean_ratio_v: 0.3,
      n: 1600,
    });
  });

  it('yields exactly the four legacy cohorts for a pre-ladder payload', () => {
    // A cached four-cohort payload must produce four real points, NOT seven
    // with three phantom `{cohort}` entries whose fields are all undefined.
    const ordered = orderAgeCohorts(legacyCohorts);
    expect(ordered).toHaveLength(4);
    expect(ordered.map((c) => c.cohort)).toEqual(['now', 'last60', 'last40', 'last20']);
    for (const point of ordered) {
      expect(point.cohort_label).toBeDefined();
      expect(point.n).toBeDefined();
      expect(point.mean_ratio_v).toBeDefined();
    }
  });

  it('keeps an empty window as a point so the chart can gap it', () => {
    // RES ships thin windows as `mean_ratio_v: null, n: 0` rather than
    // dropping the key; the point must survive so the line gaps there.
    const sparse: AgeCohorts = {
      ...cohorts,
      last5: { cohort_label: 'Last 5 years', mean_ratio_v: null, n: 0 },
    };
    const ordered = orderAgeCohorts(sparse);
    expect(ordered).toHaveLength(7);
    const last = ordered[6];
    expect(last.cohort).toBe('last5');
    expect(last.mean_ratio_v).toBeNull();
    // The chart's own gate: at least ONE finite mean means it still renders.
    expect(ordered.some((c) => Number.isFinite(c.mean_ratio_v))).toBe(true);
  });

  it('renders nothing to plot only when every window is empty', () => {
    const allEmpty = Object.fromEntries(
      Object.entries(cohorts).map(([k, v]) => [k, { ...v, mean_ratio_v: null, n: 0 }]),
    ) as AgeCohorts;
    const ordered = orderAgeCohorts(allEmpty);
    expect(ordered.some((c) => Number.isFinite(c.mean_ratio_v))).toBe(false);
  });
});

describe('cohortTickYears', () => {
  it('reduces every window key to its bare, locale-neutral year count', () => {
    expect(orderAgeCohorts(cohorts).map((c) => cohortTickYears(c.cohort))).toEqual([
      null,
      '60',
      '40',
      '20',
      '15',
      '10',
      '5',
    ]);
  });

  it('leaves the all-years baseline to the caller so it can be translated', () => {
    expect(cohortTickYears('now')).toBeNull();
  });
});

describe('sampleSizeDotRadius', () => {
  it('never grows as the sample thins', () => {
    const radii = [1600, 900, 600, 120, 40, 20, 8, 0].map(sampleSizeDotRadius);
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeLessThanOrEqual(radii[i - 1]);
    }
  });

  it('draws a two-parcel window visibly smaller than an 800-parcel one', () => {
    expect(sampleSizeDotRadius(2)).toBeLessThan(sampleSizeDotRadius(800));
  });

  it('stays a valid radius for a missing or nonsense n', () => {
    expect(sampleSizeDotRadius(0)).toBeGreaterThan(0);
    expect(sampleSizeDotRadius(Number.NaN)).toBeGreaterThan(0);
  });
});

/**
 * Source contracts for the chart itself. These read the shipped source rather
 * than rendering, for the same reason the panel-tab and market-section suites
 * do: the behaviour worth protecting is which branch wins and which recharts
 * prop is set, and neither has a runtime value to assert without standing up
 * recharts in a DOM.
 */
describe('chart degradation', () => {
  it('gates the empty state on NO cohort having data, not on all of them having it', () => {
    expect(chart).toContain("const hasAnyData = data.some((d) => d.ratio_v !== null)");
    expect(chart).toContain('{!hasAnyData ? (');
    // The old all-or-nothing gate would blank the chart for most zones now
    // that the narrow windows are frequently empty.
    expect(chart).not.toContain('allFinite');
    expect(chart).not.toContain('data.every(');
  });

  it('bridges empty windows instead of ending the line at the first gap', () => {
    expect(chart).toContain('connectNulls');
  });

  it('normalises a non-finite mean to null, which is what recharts gaps', () => {
    expect(chart).toContain('Number.isFinite(c.mean_ratio_v) ? (c.mean_ratio_v as number) : null');
  });
});

describe('chart labelling and sample size', () => {
  it('derives the axis tick from the cohort key, never the English API label', () => {
    expect(chart).toContain("cohortTickYears(c.cohort) ?? t('panel.zone.cohort_all')");
    expect(chart).not.toContain('label: c.cohort_label');
  });

  it('shows every one of the seven ticks', () => {
    expect(chart).toContain('interval={0}');
  });

  it('encodes n in the dot radius and keeps it in the tooltip', () => {
    expect(chart).toContain('sampleSizeDotRadius(payload?.n ?? 0)');
    expect(chart).toContain('dot={renderSampleSizeDot}');
    expect(chart).toContain("t('panel.zone.cohort_tooltip', { value: v.toFixed(3), n })");
  });

  it('keeps the dot on the data red, introducing no new colour', () => {
    const dot = chart.slice(chart.indexOf('const renderSampleSizeDot'));
    expect(dot).toContain("fill=\"#ef4444\"");
    expect(dot).toContain("stroke=\"#7f1d1d\"");
  });

  it('states the unit once, in the subtitle', () => {
    expect(chart).toContain("t('panel.zone.over_time_subtitle')");
  });
});

describe('new copy is translated everywhere', () => {
  for (const locale of LOCALES) {
    it(`carries the ladder keys in ${locale}`, () => {
      const block = localeBlock(locale);
      for (const key of [
        'panel.zone.cohort_all',
        'panel.zone.cohort_tooltip_no_data',
        'panel.zone.over_time_subtitle',
      ]) {
        expect(block, `${key} missing in ${locale}`).toContain(`'${key}':`);
      }
    });
  }

  it('names the unit in every locale subtitle so a bare "60" is unambiguous', () => {
    const units = { en: '(years)', fr: '(années)', de: '(Jahre)', it: '(anni)' };
    for (const [locale, unit] of Object.entries(units)) {
      const block = localeBlock(locale);
      const line = block
        .split('\n')
        .find((l) => l.includes("'panel.zone.over_time_subtitle':"));
      expect(line, `subtitle missing in ${locale}`).toBeDefined();
      expect(line).toContain(unit);
    }
  });
});

describe('a gapped cohort is hoverable, not silent', () => {
  const chart = readFileSync(
    new URL('./UtilizationOverTime.tsx', import.meta.url),
    'utf8',
  );

  it('turns off recharts filterNull, or the no-data branch is dead code', () => {
    // recharts defaults filterNull to TRUE and drops every payload entry whose
    // value is null BEFORE the formatter runs, then hides the tooltip. With
    // seven cohorts the narrow steps are null for most zones, so the default
    // makes hovering a gap do nothing at all AND makes the no-data branch
    // below it unreachable. This assertion is what stops that regressing back
    // into dead code the next time the Tooltip props are touched.
    expect(chart).toContain('filterNull={false}');
  });

  it('still has a no-data branch for the formatter to reach', () => {
    expect(chart).toContain('panel.zone.cohort_tooltip_no_data');
  });
});

describe('the persistent cache cannot serve a pre-ladder payload', () => {
  it('carries a payload-shape version in the zone-stats cache key', () => {
    const service = readFileSync(
      new URL('../../services/zoneStatsService.ts', import.meta.url),
      'utf8',
    );
    // The IDB store has no TTL and its upgrade path preserves entries across
    // DB_VERSION bumps, so the KEY is the only thing that retires them.
    expect(service).toContain('return `v2:${req.fso}:${req.cz_local}`;');
  });
});
