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
    // Re-pinned to v1.178.0, the deferred session-replay boot: initOpenReplay
    // (which room calls in main.tsx) no longer boots the OpenReplay tracker
    // inside the startup blocking window. It now waits for the window load
    // event + 2.5 s + an idle callback, splits import/construct/start across
    // macrotasks, and buffers identify()/handleError() raised before the
    // deferred start. Measured on boost production this cuts ~450 ms of total
    // blocking time on desktop, more on slow devices. No API surface changed;
    // bootMode: 'immediate' restores the old behavior.
    //
    // Re-pinned to v1.177.0, the municipal-zone release: default single /
    // cz_local. The zone an Aireon app shows is the MUNICIPAL designation
    // ("Dorfzone 2", "Wohnzone, Bauklasse 4"); the federal category
    // ("Zentrumszonen", "Wohnzonen") is a filter, never the label. This
    // reverses v1.173's harmonized-first default. resolveZoneLabel(),
    // resolveZoneRows() and Claire's buildParcelContextSummary all flip with
    // the pin; room's cohorts stay keyed on cz_local. Between v1.173.3 and
    // v1.177.0 the only shared changes are zone-related (runtime zoneConfig +
    // useZoneConfig, resolveZoneRows, one-line Claire zone context).
    //
    // Re-pinned to v1.173.3, the Claire one-zone context + spare-space canton
    // guard: buildParcelContextSummary (the parcel context every shared
    // ClaireAssistant mount sends to Claire) used to emit two zone lines, the
    // raw municipal cz_local and the harmonized cz_harmonized, so Claire could
    // quote the municipal designation the panel no longer shows. It now emits
    // ONE "Zone: <resolved label>" line via the same suite rule the Parcel tab
    // uses, with the municipal designation demoted to an explicitly secondary
    // "detail only" line. lookupSpareSpace also forwards ?canton= to RES only
    // when it is a real 2-letter code (valoo had been passing zone text, which
    // matched nothing). Nothing else changed between v1.173.1 and v1.173.3.
    //
    // Re-pinned to v1.173.1 for `@aireon/shared/parcel-zone` (resolveZoneLabel):
    // the suite-wide zone rule, harmonized federal category first ("Wohnzonen"),
    // municipal designation only where none exists (all of Zürich), ordinance
    // cross-references and canton codes never. room used to print the
    // municipal cz_local ("Wohnzone, Bauklasse 4") as the zone, so the same
    // Grenchen parcel read differently here than in geopool. A repin below
    // this SHA is a build error: the subpath export does not exist.
    //
    // Re-pinned to v1.172.2 because v1.172.1 built the vintage sentence inside
    // the component in English word order, so the German line read "Juli 2025
    // Stand" instead of "Stand Juli 2025"; the whole sentence now lives in the
    // locale table so each language orders it itself.
    //
    // v1.172.1 was the data-vintage release: the shared AboutModal
    // fetches the RES dataset version on open and names the parcel snapshot,
    // when it was last computed, and (behind "Pipeline details") the date of
    // each enrichment layer. A repin below this SHA is not a build error, the
    // About dialog simply loses the line that says how old the building volume
    // on screen is.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('d90c2910a71ab5098a71e43b4cba3dcc060a1c5c');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});
