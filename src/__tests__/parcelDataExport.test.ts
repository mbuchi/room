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
    //
    // Re-pinned to v1.185.0, "keep ?select= in step with the screen":
    // `updateConfirmedLocationUrl` now WRITES `?select=` as well as reading it,
    // inferring the value from the call — 'parcel' when it names a label or an
    // identity, 'off' when it clears all of them. That is exactly the shape
    // room's `stampConfirmedParcelUrl` / `clearConfirmedParcelUrl` pair already
    // has, so both sides came for free with the version bump: selecting stamps
    // select=parcel, closing the panel stamps select=off. Before this, closing
    // the panel dropped ?q/?egrid but left the URL silent about the closure, so
    // a link copied from a closed panel was indistinguishable from one copied
    // before anything was ever selected. A repin below this SHA is not a build
    // error — `select` is an optional option — the address bar just stops
    // stating whether the panel is open.
    //
    // Re-pinned to v1.184.0, "don't open the neighbour's parcel on a drifted
    // reload": `getParcelAutoSelect()` now also returns `requireIdMatch`, true
    // exactly when the URL is self-written AND names a parcel. room rewrites
    // ?lat/?lng on every moveend while ?egrid stays put, so selecting a parcel
    // and panning away leaves a URL whose coordinates are the camera centre;
    // v1.183.0 re-selected on that reload but hit-tested those coordinates and
    // `pickDeepLinkFeature` fell back to whatever was topmost there, opening
    // the NEIGHBOUR and presenting it as the parcel the link names. The flag
    // refuses that fallback. The same release also made `DeepLinkSelectMap`'s
    // projected-point type a type parameter inferred from the map, so
    // `autoSelectFeatureAtPoint(map, ...)` compiles against a real
    // maplibregl.Map and MapView's `as unknown as DeepLinkSelectMap` is gone.
    // A repin below this SHA is a build error: `requireIdMatch` is not on the
    // v1.183.0 option type.
    //
    // Re-pinned to v1.183.0, "open with the parcel already selected":
    // `getParcelAutoSelect()` in @aireon/shared/url-params answers whether a
    // page load owes the visitor a selection (external ?lat/?lng, or a
    // self-written URL that still carries ?egrid/?parcel_id, never under
    // ?select=off), and `autoSelectFeatureAtPoint` in
    // @aireon/shared/map-interaction is the shared idle-retrying hit-test that
    // resolves the polygon under the point, preferring the one carrying the
    // URL's id. room's deep-link boot path is built on both, so a repin below
    // this SHA is a build error: neither export exists.
    //
    // Re-pinned to v1.182.2, the 26-app "Open with" registry: LAUNCH_APPS is
    // regenerated from the hub tool registry (13 -> 30 apps), each row prints
    // the app wordmark beside its localized descriptor, and the menu grows a
    // filter box past 12 entries. New optional OpenWithMenu props (locale,
    // showDescriptors) and an optional label. v1.182.1 hid the descriptor
    // column in CSS for the mobile fold-in, covering a direct <OpenWithMenu>
    // rendered inside actionsExtra as well as the AppNavbar openWith path.
    // v1.182.2 then raised LAUNCH_DEFAULT_ZOOM from 15.00 to 17.00, matching
    // DEEP_LINK_MIN_ZOOM and the hub launcher: cross-app parcel hand-offs now
    // land above the z17 parcel hover/click gate without any per-app zoom
    // prop. A repin below this drops every hand-off back to 15.00, two levels
    // out, where auto-select misses on the receiving app. Everything pinned above is
    // still in it.
    // Re-pinned to v1.186.1 for AppNavbar's combined search/Open-with field,
    // including the current-app default and remembered destination target.
    //
    // Re-pinned to v1.191.0 for signal carrier transport: `installSignalCarrier`
    // on the root barrel queues usage signals in memory and flushes what is left
    // once on pagehide, instead of one POST per action. src/main.tsx calls it, so
    // a repin below this SHA is a build error: the export does not exist. The
    // flush target is api/ctx.ts, a second one-line re-export of
    // @aireon/shared/signal-collect. Transport only; the same data is collected
    // and stored as before. See aireon-shared/docs/SIGNAL_STANDARD.md.
    //
    // Re-pinned to v1.192.0, "one engine for the suite", retaining all of the
    // above. aireonHtmlPlugin now marks `maplibre-gl` external and injects an
    // import map resolving it to
    // https://static.aireon.ch/maplibre-gl@<version>/maplibre-gl.mjs, so the
    // ~1 MB engine leaves room's bundle and is fetched once for the whole
    // suite. The export payload is untouched. A repin below this puts the
    // engine chunk back: not a build error, just a megabyte per app per release.
    //
    // Re-pinned to v1.193.0, which lets the carrier ride an EDGE handler.
    // Before it, `withSignalCarrierWeb` looked only for `globalThis.waitUntil`,
    // which Vercel does not expose, so on the edge runtime the RES fan-out was a
    // floating promise in an isolate about to be torn down - and it acked anyway,
    // which is what tells the browser queue to destroy its copy. v1.193.0 reads
    // Vercel's per-request context instead and, decisively, acknowledges ONLY
    // when it resolved a waitUntil. api/parcel-data.ts is wrapped with it and
    // src/main.tsx declares `paths: ['/api/parcel-data']`, so a repin below this
    // SHA silently reintroduces "acked, never written" on room's primary action.
    // Resolved commit 17a2fe79a62f0973f7c2078d20319a66528b36a5.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('17a2fe79a62f0973f7c2078d20319a66528b36a5');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});
