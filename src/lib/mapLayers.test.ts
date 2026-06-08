import { describe, it, expect } from 'vitest';
import type { Map } from 'mapbox-gl';
import {
  densityFillColor,
  densityFillOpacity,
  densityLineColor,
  densityLineOpacity,
  wireParcelHover,
  HOVER_MIN_ZOOM,
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

/** Minimal Mapbox `Map` stand-in that records delegated (layer-scoped) and
 *  map-level listeners so we can assert the hover wiring binds/detaches by
 *  zoom. setZoom() mimics a real zoom by firing the registered `zoomend`. */
function makeFakeMap(initialZoom: number) {
  let zoom = initialZoom;
  const mapHandlers: Record<string, Array<() => void>> = {};
  const delegated: Array<{ type: string; layer: string; fn: unknown }> = [];
  const filters: Record<string, unknown> = {};
  const canvas = { style: { cursor: '' } };
  const map = {
    getZoom: () => zoom,
    getCanvas: () => canvas,
    getLayer: () => ({}), // hover layer present (truthy) — see wireParcelHover guard
    setFilter: (id: string, f: unknown) => { filters[id] = f; },
    on(type: string, layerOrFn: unknown, fn?: unknown) {
      if (typeof layerOrFn === 'string') delegated.push({ type, layer: layerOrFn, fn });
      else (mapHandlers[type] ??= []).push(layerOrFn as () => void);
    },
    off(type: string, layer: unknown, fn?: unknown) {
      const i = delegated.findIndex((d) => d.type === type && d.layer === layer && d.fn === fn);
      if (i >= 0) delegated.splice(i, 1);
    },
    // test helpers (not part of the Map API)
    setZoom(z: number) { zoom = z; (mapHandlers['zoomend'] ?? []).forEach((h) => h()); },
    parcelFillListeners: () => delegated.filter((d) => d.layer === 'parcel-fill'),
    filters,
    canvas,
  };
  return map;
}

describe('wireParcelHover — zoom-gated hover (low-spec perf)', () => {
  it('does NOT bind hover listeners when the map loads zoomed out', () => {
    const map = makeFakeMap(HOVER_MIN_ZOOM - 1);
    wireParcelHover(map as unknown as Map);
    expect(map.parcelFillListeners()).toHaveLength(0);
  });

  it('binds mousemove + mouseleave when at/above block level', () => {
    const map = makeFakeMap(HOVER_MIN_ZOOM);
    wireParcelHover(map as unknown as Map);
    const types = map.parcelFillListeners().map((d) => d.type).sort();
    expect(types).toEqual(['mouseleave', 'mousemove']);
  });

  it('detaches the listeners and clears the highlight when zooming back out', () => {
    const map = makeFakeMap(HOVER_MIN_ZOOM + 1);
    wireParcelHover(map as unknown as Map);
    expect(map.parcelFillListeners()).toHaveLength(2);

    map.setZoom(HOVER_MIN_ZOOM - 1); // fires zoomend
    expect(map.parcelFillListeners()).toHaveLength(0);
    // hover layer filter reset so nothing stays lit
    expect(JSON.stringify(map.filters['parcel-hover'])).toContain('parcel_id');
    expect(map.canvas.style.cursor).toBe('');
  });

  it('binds on the way back in, and never double-binds within the same band', () => {
    const map = makeFakeMap(HOVER_MIN_ZOOM - 1);
    wireParcelHover(map as unknown as Map);
    map.setZoom(HOVER_MIN_ZOOM + 1);
    expect(map.parcelFillListeners()).toHaveLength(2);
    map.setZoom(HOVER_MIN_ZOOM + 2); // still above → must not re-bind
    expect(map.parcelFillListeners()).toHaveLength(2);
  });

  it('is idempotent per map (basemap swaps re-run addParcelLayers)', () => {
    const map = makeFakeMap(HOVER_MIN_ZOOM + 1);
    wireParcelHover(map as unknown as Map);
    wireParcelHover(map as unknown as Map); // second call must be a no-op
    expect(map.parcelFillListeners()).toHaveLength(2);
  });
});
