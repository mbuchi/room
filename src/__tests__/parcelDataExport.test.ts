import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mapView = read('components/MapView.tsx');
const header = read('components/ParcelPanelHeader.tsx');
const lock = JSON.parse(read('../package-lock.json'));

describe('parcel data export', () => {
  it('exports RES, feature, canonical identity and polygon data', () => {
    expect(mapView).toContain('appId="room"');
    expect(mapView).toContain('additionalData={{ res: parcelData, feature: selectedParcel.props }}');
    expect(mapView).toContain('geometry={selectedParcel.geometry}');
    expect(mapView).toContain('parcelData?.egrid ?? selectedParcel.egrid ?? selectedParcel.parcelId');
    // Pinned SHA, not just the tag: npm caches git tag resolutions, so a repin
    // that does not move `resolved` is inert and every downstream gate is
    // measuring the old code. Bump this string whenever @aireon/shared is
    // repinned, and say why.
    //
    // v1.163.0 adds the `@aireon/shared/map-worker` subpath (applyMapWorkerUrl),
    // which is mandatory now that room runs MapLibre GL v6: v6 derives its
    // tile-worker URL from its own import.meta.url, and that is meaningless
    // once the bundler has rewritten the engine into room's `maplibre` chunk.
    // Without the seam the worker never starts and the map paints blank in
    // production only. It carries forward v1.159.2's first-load standard
    // (aireonHtmlPlugin build-time shell + theme bootstrap, self-hosted fonts,
    // an AppAccessGate that does not block the tree on an unbounded
    // app_settings fetch) and the bootstrap fix mirroring
    // resolveThemePreference, so OS-light is still not treated as a decision
    // and room's dark default survives the first frame.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('3bcb800e028a438153e6cd09a89a215667dec4a8');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});
