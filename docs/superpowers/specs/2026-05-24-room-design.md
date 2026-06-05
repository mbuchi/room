# room — design spec

**Date:** 2026-05-24
**Status:** approved, in flight
**Owner:** mbuchi (SwissNovo)

## 1. Problem & one-line answer

`room` is a new map-first SwissNovo app that answers a single hard question
the rest of the suite does not:

> **How densely is this zone actually built — and what does that mean for my parcel?**

Existing apps in the suite either show a parcel's own attributes (groove,
valoo, footprint) or a single municipal aggregate. None of them place the
selected parcel **inside the distribution of comparable parcels in the same
zoning category in the same municipality**, which is the core analytical
question planners, valuers, and developers actually ask.

## 2. Scope

### In scope (v1)

- Map-first parcel selector with a **choropleth fill** that shades every
  parcel in the selected zone by its utilisation percentile while a parcel
  is selected. Selected parcel outlined.
- Right-side panel with two sections:
  - **Parcel facts:** municipality, FSO, CZ Local, CZ Canton, parcel area,
    existing building volume, year of construction, floor-area proxy,
    `ratioV`, `freeV`.
  - **Zone distribution:** zone switcher dropdown (auto-selects current
    zone, lets user switch to another zone in the same municipality),
    boxplot + density curve, six histograms (`ratioV`, `freeV`, `ratioS`,
    `GFZ`, building height, number of floors) with a "you are here"
    reference line, a 0–100 percentile gauge, utilisation-over-time line
    chart across age cohorts (now / last 20 / 40 / 60 years), and a scatter
    tab (parcel area vs. building volume with regression line).
- Standard SwissNovo chrome: shared auth (`@aireon/shared` AuthProvider),
  release notes panel, login modal, user menu, locale selector, app tour
  (react-joyride), screenshot capture, Claire AI assistant on selected
  parcel.
- Address search, locate-me, basemap switcher, 3D toggle (same as groove).
- `?lat`/`?lng` deep-link support, opening at zoom ≥ 17.

### Out of scope (v1)

- Tile-level pre-aggregated choropleth — colours are applied via Mapbox
  `setFeatureState` on already-loaded parcel tiles.
- CSV / PDF export of zone stats.
- Printable single-page report.
- Claire deep integration with the new zone-stats payload (Claire keeps
  groove's standard parcel-context behaviour).
- A separate "city dashboard" view — `room` stays parcel-centric.

## 3. Architecture

Three repos are touched: **`room`** (new), **`project_RES`** (one new
endpoint + additive fields), **`toolbox`** (registration).

### 3.1 New repo `mbuchi/room`

Cloned from `mbuchi/groove` `main` (latest), with groove-specific UI
stripped (notably the GWR/PRM `InfoPanel`). What stays from groove because
it is suite-shared infrastructure: `App.tsx` provider stack, `MapView` map
shell, `Navbar`, `MapControls`, `ZoomControl`, `CoordinateDisplay`,
`LocateButton`, `LocationPermissionModal`, `Toast`, `UserMenu`,
`ScreenshotButton`, `SavedImagesPanel`, the `api/` edge functions, the
`tour/` system, the `auth/` and `contexts/` directories, and
`lib/{mapConfig,mapLayers,coordTransform,geocode,signal}.ts`.

Module layout (new files only):

```
src/
├── components/
│   ├── ZoneInfoPanel.tsx              parcel facts header (replaces groove InfoPanel)
│   ├── ZonePanel.tsx                  scrollable host for all charts (composes children)
│   ├── ZoneSelectorDropdown.tsx       cz_local switcher within current FSO
│   └── charts/
│       ├── BoxplotDensity.tsx         boxplot + density curve overlay
│       ├── DistributionHistogram.tsx  reused 6× with "you are here" reference line
│       ├── UtilizationOverTime.tsx    Recharts LineChart, 4 cohorts
│       ├── VolumeVsAreaScatter.tsx    ScatterChart + regression line + selected highlight
│       └── PercentileGauge.tsx        SVG arc 0–100
├── services/
│   ├── parcelDataService.ts           POST /res_api/parcel_data wrapper (typed)
│   ├── zoneStatsService.ts            POST /res_api/zone_stats + session Map<string,…> cache
│   └── statsMath.ts                   percentile-of-value + linear-regression helpers
└── lib/
    └── mapLayers.ts                   extended: choropleth fill expression keyed off feature-state
```

### 3.2 Backend `project_RES`

```
project_RES/
├── routes/res_api.js          (extend POST /parcel_data response; add POST /zone_stats handler)
├── sql/zone_stats.sql         (new — parameterised aggregation query)
└── api_docs/openapi.json      (v1.3.0 — document the six new parcel-data fields + /zone_stats)
```

In-memory LRU cache for `zone_stats` keyed on `${fso}:${cz_local}`,
TTL 1h, capacity 500 — same shape as the existing `/parcel_data` cache.

### 3.3 Registration `toolbox`

```
toolbox/
├── src/data/tools.json                (add room entry — descriptor, capabilities, capabilityMatrix)
├── src/data/graphRelations.ts         (add room → analysis cluster + edges to groove, valoo, footprint)
├── src/components/CapabilitiesMatrix.tsx  (add room row — no schema change)
└── src/data/releaseNotes.ts           (changelog entry recording room registration)
```

## 4. Data contracts

### 4.1 `POST /res_api/parcel_data` — additive fields

Existing response unchanged except six new properties on the returned
GeoJSON feature:

```ts
properties: {
  // ... all existing fields ...
  ratio_v:        number | null,   // built_volume / cz_util_est (allowed volume)
  free_v:         number | null,   // (cz_util_est - built_volume) in m³ (can be negative)
  ratio_s:        number | null,   // built_footprint_area / parcel_area
  gfz:            number | null,   // (floor_area_total) / parcel_area  — GFZ
  bldg_height_m:  number | null,   // max(height_max) across the parcel's buildings, metres
  bldg_floors_n:  number | null,   // max(floors) across the parcel's buildings
}
```

Each is `null` when the underlying inputs are missing (no footprint, no
`cz_util_est` reference, non-buildable zone, etc.). Computed in the same
SQL pass that already populates the existing `cz_*` and building fields.

### 4.2 `POST /res_api/zone_stats` — new endpoint

```ts
// Request
{ fso: number, cz_local: string, lang?: 'de' | 'en' | 'fr' | 'it' }

// Response
{
  zone: {
    fso: number,
    municipality_name: string,
    cz_local: string,
    cz_canton: string,
    parcel_count: number,
  },
  other_zones: Array<{ cz_local: string, parcel_count: number }>, // dropdown source
  distributions: {
    ratio_v:       number[],
    free_v:        number[],
    ratio_s:       number[],
    gfz:           number[],
    bldg_height_m: number[],
    bldg_floors_n: number[],
  },
  summary: {
    ratio_v:       Summary,
    free_v:        Summary,
    ratio_s:       Summary,
    gfz:           Summary,
    bldg_height_m: Summary,
    bldg_floors_n: Summary,
  },
  age_cohorts: {
    now:    { cohort_label: string, mean_ratio_v: number, n: number },
    last20: { cohort_label: string, mean_ratio_v: number, n: number },
    last40: { cohort_label: string, mean_ratio_v: number, n: number },
    last60: { cohort_label: string, mean_ratio_v: number, n: number },
  },
  parcels: Array<{
    egrid:  string,
    area:   number,
    volume: number,
    year:   number | null,
  }>,
}

type Summary = {
  min: number, max: number,
  p5: number, p25: number, p50: number, p75: number, p95: number,
  mean: number, n: number,
}
```

Server-side rules:

- `null`s are excluded from `distributions[*]` arrays and `summary` stats.
- Hard outliers (above p99.5 or below p0.5 of each metric within the zone)
  are excluded from `distributions[*]` so the charts read cleanly; raw
  `min`/`max` are preserved in `summary` so the UI can still label them.
- `parcels[]` is unfiltered — the scatter shows everything so the
  regression line stays honest.

## 5. Frontend behaviour

### 5.1 Selection flow

1. User clicks a parcel on the map.
2. `MapView.onClick('parcel-fill')` → `selectParcelFromProps()` sets
   `selectedParcel`.
3. In parallel:
   - `parcelDataService.fetch(egrid, lng, lat)` → populates the **parcel
     facts** section of `ZoneInfoPanel`.
   - From the parcel-data response we read `fso` and `cz_local`, then
     `zoneStatsService.fetch(fso, cz_local)` → populates `ZonePanel`.
4. `ZonePanel` calls `map.setFeatureState({source, id: egrid}, {percentile})`
   for every entry in `parcels[]` so the choropleth lights up; parcels not
   in `parcels[]` fade to neutral. Selected parcel gets a thick outline
   (filter on `parcel-selected` layer, same pattern as groove).
5. `ZoneSelectorDropdown` shows `other_zones`. Picking another zone calls
   `zoneStatsService.fetch(fso, newCzLocal)` and re-paints feature-state
   — without re-fetching parcel data.

### 5.2 Caching

- Session-scoped `Map<string, ZoneStatsResponse>` in `zoneStatsService.ts`
  keyed `${fso}:${cz_local}`.
- Server-side LRU in RES (same key, 1h TTL).

### 5.3 Choropleth fill (Mapbox)

`mapLayers.ts` adds an `interpolate` `fill-color` expression on
`parcel-fill` that reads `feature-state['percentile']` (range 0–1). Parcels
without a feature-state value fall back to a neutral grey fill. The
selected parcel keeps its existing outline highlight.

### 5.4 Percentile-of-value

`statsMath.percentileOfValue(distribution, value)` returns where the
selected parcel's metric falls in the zone distribution (0–100). Drives
both the gauge and the histogram reference lines.

## 6. Toolbox registration

### 6.1 `tools.json` entry

```jsonc
{
  "id": "room",
  "descriptor": {
    "en": "Zoning density explorer — see how built-up any Swiss zone actually is, and where your parcel sits on the distribution.",
    "de": "Zonen-Dichte-Explorer — sehen Sie, wie dicht eine Schweizer Zone tatsächlich bebaut ist und wo Ihre Parzelle in der Verteilung liegt.",
    "fr": "Explorateur de densité de zonage — voyez à quel point une zone suisse est réellement construite, et où se situe votre parcelle dans la distribution.",
    "it": "Esploratore di densità di zonizzazione — scoprite quanto densamente è costruita una zona svizzera e dove si trova la vostra particella nella distribuzione."
  },
  "categories": ["analysis", "zoning", "maps"],
  "capabilities": [
    "parcel_map",
    "zone_distribution",
    "percentile_ranking",
    "utilization_over_time"
  ],
  "capabilityMatrix": {
    "latLng": "yes",
    "mapFirst": "yes",
    "aiChat": "yes",
    "signal": "yes",
    "imageExport": "yes",
    "tour": "yes",
    "langSupport": "yes",
    "liveVoice": "no"
  },
  "priority": 1
}
```

### 6.2 `graphRelations.ts`

Cluster `room` under `analysis` (primary); edges to `groove`, `valoo`,
`footprint` (related parcel-explorer apps in the suite).

### 6.3 `CapabilitiesMatrix.tsx`

Add one row keyed on `id: "room"`. No schema change.

## 7. Release notes

`room/src/data/releaseNotes.ts` ships with a single `v0.1.0` entry
(`How Dense, Really?`) listing all the features above.

`toolbox/src/data/releaseNotes.ts` gets a new entry recording the room
registration.

## 8. Publish order (CLAUDE.md workflow)

Per-repo feature branch → commit → push → PR → squash-merge:

1. **`project_RES`** first — `/parcel_data` field extensions, new
   `/zone_stats` endpoint, SQL, OpenAPI v1.3.0 bump. Auto-deploys via
   GitHub Actions → `/git_pull_and_restart`. Required before room
   frontend works against production.
2. **`room`** — initial commit to a brand-new repo
   (`gh repo create mbuchi/room --public`). Push `main` directly (no PR
   for the bootstrap commit). Vercel project provisioning is a one-time
   dashboard click and is left to the user.
3. **`toolbox`** — registration PR (tools.json, graph, capability matrix,
   release notes).

## 9. Tests / verification

`room` and `toolbox` both have `npm run build` (Vite + tsc) — the
verification step in this workstream is the production build succeeding
on each.

`project_RES` does not have a typecheck script; verification is a hand-test
of the new endpoint against a known parcel + zone after deploy.

## 10. Risks & open items

- **`cz_util_est` coverage:** zones without an allowed-utilisation
  reference (agriculture, forest, water, public-buildings) will show
  `null` for `ratio_v`, `free_v`. The frontend handles this by greying
  out those charts with a "No reference allowed-utilisation for this
  zone." note.
- **Mapbox feature-state at high zoom:** parcels outside the rendered
  tile region won't receive `setFeatureState` calls until they tile in.
  The choropleth therefore reveals progressively as the user zooms.
  Acceptable for v1.
- **`other_zones` cardinality:** some municipalities have 20+ distinct
  `cz_local` values. The dropdown is searchable and groups long lists by
  category prefix to stay usable.
