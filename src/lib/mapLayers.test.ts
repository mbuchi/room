import { describe, it, expect } from 'vitest';
import {
  densityFillColor,
  densityFillOpacity,
  densityLineColor,
  densityLineOpacity,
  type ActiveZone,
} from './mapLayers';

const ZONE: ActiveZone = { fso: 261, czLocal: 'dreigeschossige Wohnzone', breakpoints: [0, 36, 91, 142, 282] };

function interpolateStops(expr: unknown): number[] {
  // densityFillColor(zone) => ['case', <inZone>, <interpolate>, '#334155']
  const interp = (expr as unknown[])[2] as unknown[];
  expect(interp[0]).toBe('interpolate');
  const stops: number[] = [];
  for (let i = 3; i < interp.length; i += 2) stops.push(interp[i] as number);
  return stops;
}

describe('densityFillColor', () => {
  it('returns a plain colour string (not a literal expr) when no zone', () => {
    // A `['literal', '#hex']` would throw in Mapbox (literal wants array/object).
    expect(densityFillColor(null)).toBe('#475569');
  });

  it('builds a case→interpolate keyed on the zone fso + cz_local', () => {
    const expr = densityFillColor(ZONE) as unknown[];
    expect(expr[0]).toBe('case');
    const cond = JSON.stringify(expr[1]);
    expect(cond).toContain('fso_num_2021');
    expect(cond).toContain('cz_local');
    expect(JSON.stringify(expr[2])).toContain('ratio_v');
  });

  it('produces STRICTLY ASCENDING interpolate stops (Mapbox throws otherwise)', () => {
    const stops = interpolateStops(densityFillColor(ZONE));
    expect(stops).toHaveLength(5);
    for (let i = 1; i < stops.length; i++) expect(stops[i]).toBeGreaterThan(stops[i - 1]);
  });

  it('still ascending for a degenerate zone (all breakpoints equal)', () => {
    const stops = interpolateStops(densityFillColor({ fso: 1, czLocal: 'z', breakpoints: [0, 0, 0, 0, 0] }));
    for (let i = 1; i < stops.length; i++) expect(stops[i]).toBeGreaterThan(stops[i - 1]);
  });

  it('falls back to absolute thresholds when breakpoints are missing', () => {
    const stops = interpolateStops(densityFillColor({ fso: 1, czLocal: 'z' }));
    expect(stops).toEqual([0, 50, 100, 150, 220]);
  });
});

describe('density opacity / line expressions', () => {
  it('opacity is a number with no zone, a case with a zone', () => {
    expect(typeof densityFillOpacity(null, 0.6)).toBe('number');
    expect((densityFillOpacity(ZONE, 0.6) as unknown[])[0]).toBe('case');
  });
  it('line colour is a string with no zone, a case with a zone', () => {
    expect(typeof densityLineColor(null)).toBe('string');
    expect((densityLineColor(ZONE) as unknown[])[0]).toBe('case');
    expect(typeof densityLineOpacity(null, 0.6)).toBe('number');
  });
});
