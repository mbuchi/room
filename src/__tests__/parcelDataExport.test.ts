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
    // v1.165.0 brings the parcel-address standard into MapContextMenu: a
    // parcel's address is resolved from its EGRID (tile props first, then the
    // building register), never by reverse-geocoding the clicked coordinate.
    // The old point lookup asked geo.admin `identify` for every entrance within
    // 50 m and took results[0] — feature order, not distance — which named an
    // address on a DIFFERENT parcel in 92% of 71 sampled parcels, and made the
    // answer a function of the pixel clicked. It carries forward v1.163.0's
    // `@aireon/shared/map-worker` subpath (applyMapWorkerUrl), which is
    // mandatory now that room runs MapLibre GL v6: v6 derives its tile-worker
    // URL from its own import.meta.url, and that is meaningless once the
    // bundler has rewritten the engine into room's `maplibre` chunk. Without
    // the seam the worker never starts and the map paints blank in production
    // only. Also still carries v1.159.2's first-load standard (aireonHtmlPlugin
    // build-time shell + theme bootstrap, self-hosted fonts, an AppAccessGate
    // that does not block the tree on an unbounded app_settings fetch) and the
    // bootstrap fix mirroring resolveThemePreference, so OS-light is still not
    // treated as a decision and room's dark default survives the first frame.
    //
    // Re-pinned to v1.172.1, the data-vintage release: the shared AboutModal
    // fetches the RES dataset version on open and names the parcel snapshot,
    // when it was last computed, and (behind "Pipeline details") the date of
    // each enrichment layer. A repin below this SHA is not a build error, the
    // About dialog simply loses the line that says how old the building volume
    // on screen is.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('a7ffe8b5539e67781884fa3e874323dcb87d7bb9');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});
