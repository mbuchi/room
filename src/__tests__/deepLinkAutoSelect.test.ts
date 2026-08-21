import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mapView = read('components/MapView.tsx');

/**
 * The deep-link auto-select is wired inside MapView's map-construction effect,
 * behind a dynamic MapLibre import and a live WebGL context, so there is no
 * unit seam that can run it. These assertions guard the wiring itself; the
 * decision it feeds is covered behaviorally in lib/__tests__/mapConfig.test.ts.
 */
describe('deep-link auto-select wiring', () => {
  it('routes every non-click selection through the shared idle-retrying hit-test', () => {
    expect(mapView).toContain("from '@aireon/shared/map-interaction'");
    expect(mapView).toContain('autoSelectCancelRef.current = autoSelectFeatureAtPoint(map, {');
    expect(mapView).toContain("layers: ['parcel-hit'],");
  });

  it('threads requireIdMatch from the URL into the hit-test', () => {
    // Without this, a reload of a self-written URL hit-tests the camera centre
    // (which ?lat/?lng track) and falls back to the topmost feature there, so
    // the panel opens the NEIGHBOUR of the parcel ?egrid names.
    expect(mapView).toContain('requireIdMatch: autoSelect.requireIdMatch,');
    expect(mapView).toContain('requireIdMatch: opts.requireIdMatch ?? false,');
  });

  it('leaves the search pick and the context-menu load forgiving', () => {
    // They hit-test a point the visitor just chose and carry no id, so the flag
    // is inert for them: exactly one call site sets it.
    expect(mapView.match(/requireIdMatch: autoSelect\.requireIdMatch/g) ?? []).toHaveLength(1);
  });

  it('hands the real map to the helper with no structural cast', () => {
    // @aireon/shared v1.184.0 made the projected-point type a type parameter
    // inferred from the map, so maplibregl.Map satisfies DeepLinkSelectMap
    // directly. The cast is what a stale pin looks like.
    expect(mapView).not.toMatch(/as unknown as DeepLinkSelectMap/);
    expect(mapView).not.toContain('type DeepLinkSelectMap');
  });

  it('does not gate the deep-link path on the live-click zoom floor', () => {
    // PARCEL_INTERACTION_MIN_ZOOM is for hover/click; a ?zoom=15 link would
    // otherwise select nothing.
    const boot = mapView.slice(mapView.indexOf('if (autoSelect.enabled'));
    expect(boot.slice(0, 400)).not.toContain('MIN_ZOOM');
  });
});
