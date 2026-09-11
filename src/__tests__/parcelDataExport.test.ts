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
    // Re-pinned to v1.196.0. The previous pin (#439, 1a179c92) sat inside the
    // window between the central user-menu runtime landing (#437) and its
    // rollback (#441): MapUserMenu routed through the <aireon-user-menu>
    // Shadow-DOM element, which cannot inherit the map-shell-user-* author CSS
    // that IS the account-menu design, so room shipped a broken-looking
    // approximation of the menu. v1.196.0 renders the bundled local shell
    // again and retains the carrier and export contracts above.
    // Resolved commit ceee4438f2f754c49138ac26cb57cef8db6956a3.
    //
    // Re-pinned to v1.201.0, which stays ABOVE the #441 rollback: the shipped
    // MapUserMenu in dist/index.js still carries the map-shell-user-* author CSS
    // and never references the <aireon-user-menu> element, so the local shell
    // above is retained. The runtime contract files still ship in the package;
    // they remain unadopted. What this pin adds for room: (1) v1.199.0 moved the
    // 44px touch floor for the compact account-menu controls into mapUi.css at
    // max-width:1023px via --aireon-touch-min, and room carries no local
    // min-h-11 override, so this is the first build where those controls meet
    // the touch floor; (2) the shared isWebGLAvailable() probe now calls
    // WEBGL_lose_context.loseContext() instead of retaining the context it
    // opened - see the note in src/lib/mapStartup.ts, which is written against
    // the OLD leaking behaviour and matters because the Massing tab can hold a
    // second live MapLibre instance; (3) isNoise() in the error reporter now
    // drops reports whose source or originating stack frame is a
    // chrome/moz/safari-extension:// URL.
    //
    // NOTE: v1.201.0 also centralises the GPU-init painter gate. room did NOT
    // route through it at this pin - src/lib/mapStartup.ts is room's own local
    // guard, shipped in 0.38.1 - so that part was a no-op here and is
    // deliberately absent from the 0.40.0 release note. (Superseded at v1.211.0
    // below: startMapGuarded now builds through the shared constructMapSafely,
    // because the painter gate alone is dead code on maplibre-gl 6.7.0.)
    //
    // v1.203.2 takes the MapLibre engine off the import map. v1.192.0 shipped
    // it as `rollupOptions.external` plus an injected
    // `<script type="importmap">`, but import maps need Safari 16.4+ /
    // Firefox 108+, ABOVE room's own build.target floor (safari16 /
    // firefox104), so on Safari 16.0-16.3 the bare `maplibre-gl` specifier did
    // not resolve and the map died while the rest of the app kept working -
    // the same user-visible outage as Bug Tracker #1158, which that target list
    // exists to prevent. aireonHtmlPlugin now resolves the exact bare id to the
    // absolute static.aireon.ch URL at build time and injects no import map, so
    // the engine needs only cross-origin dynamic import (Safari 11+). v1.203.2
    // also stops the build preflight reading a 403 as a missing asset:
    // static.aireon.ch sits behind Vercel's platform challenge, which 403s
    // Node's undici fetch while serving curl and node:https normally, so only a
    // 404 is fatal now.
    //
    // v1.205.0 serves the BASELINE engine. Removing the import map fixed
    // Firefox 104-107 but not Safari 16.0-16.3: the file itself is ES2022 and
    // carries class static blocks, which Safari < 16.4, Chrome < 94 and
    // Firefox < 93 cannot PARSE, so the failure only changed shape from
    // "cannot resolve" to SyntaxError - Bug Tracker #1158 a third time. room's
    // own build.target CANNOT fix that: the engine is external, so vite never
    // transforms those bytes (the target still lowers the locally emitted
    // worker asset). v1.205.0 points the resolver at the host's `baseline/`
    // copy, the same upstream version lowered BY THE HOST to
    // safari16,firefox104,chrome107,edge107 - the same list, applied at the
    // only place that can apply it - at +1.6% gzip. A repin below v1.205.0
    // serves the un-lowered engine again.
    //
    // v1.205.1 fixes LIGHT MODE. The pre-paint theme bootstrap stamps four
    // signals on <html> - the `dark` class, `data-theme`, `style.colorScheme`
    // and `style.backgroundColor` - but applyTheme() moved only the class, so
    // the first in-app theme change left the other three describing the OLD
    // theme. glass.css keys its dark tokens on `[data-theme='dark']
    // .glass-surface` / `.glass-control` as well as on `.dark`, so the stale
    // attribute pinned every glass panel to the dark fill while the rest of
    // the app went light: black floating dialogs, an unreadable legend and a
    // dark side panel under a white navbar, plus a dark page canvas. Only a
    // reload cleared it. All four signals now move together, both directions.
    // Resolved commit 6ed0e99d7fedcd4a33168166fa7b47b43ab73ffa.
    //
    // v1.207.4 (standing "newest tag" rule, taken with the bug #1364 basemap
    // retry fix): the pre-paint bootstrap now OWNS the dark class rather than
    // only adding it, the suite client for the central Report Engine ships,
    // the Cloudflare Turnstile bot gate lands INERT by default (no site key,
    // no gate), and naming the default signal endpoint no longer disables the
    // carrier. Resolved commit 37c0089ce4ffd8fb322b6cf53e9e220695df6e4e.
    //
    // v1.208.1 (standing "newest tag" rule): v1.208.0 regenerates the typed
    // RES API client from contract 1.19.0 (room's `@aireon/shared/api`
    // imports go through it) and v1.208.1 fixes the Claire/Gemini fallback
    // chain, which ended in a model id that does not exist, so the assistant
    // reached from the FAQ panel could fail over into a dead model. Neither
    // touches the map, the export or the parcel panel.
    // Resolved commit c47c0c3f9e97920bc56156c34cfa6189761c440c.
    //
    // v1.209.0 (standing "newest tag" rule, taken alongside the native
    // TypeScript 7 + Oxlint migration): drops hashed-chunk, unload and
    // offline noise from error reporting and self-tags automated traffic as
    // synthetic. Does not touch the map, the export or the parcel panel.
    // Resolved commit 2b280d7f57d9b4fffcf31227c01201a6c7d8e1f4.
    //
    // v1.210.0 (standing "newest tag" rule): the errorlog client gains a
    // best-effort fetch marker and a beforeCapture veto, so a reload, an
    // offline moment or a deliberately aborted request stops filing itself as
    // a fault. Does not touch the map, the export or the parcel panel.
    // Resolved commit 0d7d7166ea8c7d0454cbc718eca544a96fe0f8ae.
    //
    // v1.211.0, taken WITH the maplibre-gl 6.6.0 -> 6.7.0 bump because that bump
    // needs it. 6.7.0 changed how the engine reports a refused WebGL2 context:
    // `_setupPainter()` now THROWS a GPUInitializationError and the Map
    // constructor `_cleanupContainer()`s and rethrows, where <= 6.6.0 fired an
    // event and handed back a painter-less Map. The post-construction painter
    // gate the suite rolled out in Aug 2026 is therefore dead code on 6.7.0 —
    // the throw sails past it. v1.211.0's ONLY change is the additive
    // `constructMapSafely` / `isGpuInitializationError` pair in `src/map/webgl`,
    // routed through shared's own six construction sites in `src/map`,
    // `src/basemap`, `src/claire` and `src/massing`, plus shared's maplibre-gl
    // devDependency and the MAP_BOOTSTRAP_STANDARD doc. Nothing else is touched
    // — not the map layers, not the export, not the parcel panel. room adopts
    // it inside `lib/mapStartup.ts#startMapGuarded`, so both engine limbs end in
    // the same null and the same <MapUnavailable/>.
    // Resolved commit c657a2df0158f63b6553ed06a69062c95302aed2.
    //
    // v1.213.0 (standing "newest tag" rule): Claire stops showing three static
    // dots while she thinks. v1.212.0 put `ClaireThinking` in that slot, the
    // row the shared ClaireAssistant renders between the send and the first
    // streamed token: a breathing mark plus a status line that holds back
    // 500 ms (so a fast answer never flashes it), rotates through copy picked
    // from the question's intent, and at 24 s settles into a plain line with an
    // elapsed timer. The copy is deliberately vague about WHAT is happening,
    // and that is the honest reading: Claire calls no tools and the relay sends
    // no phase signal, so nothing is being fetched while the line shows, and
    // there is no "Searching..." frame to imply otherwise. Labels ship in
    // DE / EN / FR / IT and every animation drops under prefers-reduced-motion.
    // v1.213.0 itself only reserves one line of height in that row, so the
    // bubble no longer grows when the first line lands. The one API change is
    // an OPTIONAL `locale` prop on ClaireAssistantProps; no export moved and
    // nothing was removed, which is why typecheck stayed green through both
    // tags and why this guard is the only thing that fires. room does NOT pass
    // that prop and does not need to: getClaireThinkingLabels falls back to
    // `<html lang>`, room's I18nProvider is shared's own createI18n (see
    // contexts/I18nContext.tsx), and createI18n's provider writes
    // document.documentElement.lang on every locale change, so the navbar
    // LocaleSelector already carries the indicator along with the rest of the
    // UI. Nothing here touches the map, the export or the parcel panel.
    // Resolved commit 54fee1b4e4f7ef220a233bd2e5d54bd7ee32ef7b.
    //
    // v1.216.0 (standing "newest tag" rule, aireon-shared#491): the shared
    // error logger stops filing Turnstile's ordinary failure modes as bugs.
    // An ad blocker that refuses challenges.cloudflare.com/turnstile/v0/api.js
    // used to land in the hub bug tracker as "Resource failed to load" from
    // every app (room filed hub row 1401 on 2026-09-10); the resource-error
    // capture now drops that host, and the /api/turnstile-verify probe and
    // mint fetches inside TurnstileGate are best-effort. v1.214.0 (signed-out
    // search-history cookie also scoped to brokereum.xyz) and v1.215.0
    // (launcher entries can carry their own origin; realioo listed) ride
    // along and touch nothing room renders. Purely additive: no export moved,
    // no peerDependency changed, and typecheck stayed green.
    // Resolved commit 7a9103ddf036c69993bdb178487014496da50a62.
    //
    // v1.219.0 (standing "newest tag" rule, aireon-shared#495; the wave first
    // targeted v1.218.0 and moved here when v1.219.0 was published). Three
    // things reach room. v1.218.0 (aireon-shared#494) holds realioo out of
    // LAUNCH_APPS again until its deployed build can land a ?lat/?lng handoff
    // (the live site served its marketplace home page and dropped the
    // coordinate). Correction to the v1.216.0 note above: the v1.215.0
    // launcher change DID reach room. Navbar.tsx builds the compact
    // account-menu "Open with" rows from LAUNCH_APPS and passes `openWith` to
    // AppNavbar, whose launcher reads the same list, so room offered realioo
    // (and zeroo) from 1.216.0 on. This repin drops realioo and keeps zeroo
    // (32 -> 31 entries). v1.219.0 makes the root barrel's ClaireAssistant a
    // lazy import() wrapper (src/claire/ClaireAssistantLazy.tsx) and gives the
    // signal client its own chunk (new src/signal/index.ts). MapView.tsx
    // imports ClaireAssistant from the barrel, so the assistant leaves room's
    // entry chunk: first-load JS (entry plus modulepreloads, vite build) went
    // from 1,024,300 to 831,020 bytes against v1.218.0. Same props, and the
    // chunk is requested when the wrapper mounts. v1.217.0 rides along: the
    // errorlog client parks reports from a local dev origin as synthetic, via
    // a new additive `isLocalDevOrigin` export. Per `git diff --stat v1.216.0
    // v1.219.0 -- src`, only src/errorlog, src/nav/launchApps, src/claire (the
    // lazy wrapper and its chunk-boundary test), src/signal and the barrel
    // changed; nothing touches the map, the export or the parcel panel, and no
    // peerDependency moved.
    // Resolved commit f201ad6012b3122d906e860663d6e024f79baf06.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('f201ad6012b3122d906e860663d6e024f79baf06');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});
