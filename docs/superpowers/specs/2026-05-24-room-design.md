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
    chart across seven age cohorts (all years, then the last 60 / 40 / 20 /
    15 / 10 / 5 years — widest window first), and a scatter tab (parcel area
    vs. building volume with regression line).
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
│       ├── UtilizationOverTime.tsx    Recharts LineChart, up to 7 cohorts
│       ├── orderAgeCohorts.ts         cohort plot order + tick/dot-size helpers
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

Cache for `zone_stats`: designed as an in-process LRU (capacity 500, TTL 1h),
same shape as the existing `/parcel_data` cache. The shipped backend replaced
it with the Redis-backed shared cache in `routes/_shared/cache.js`, keyed
`zone_stats:v2:${fso}:${cz_local}` with a **30-day** TTL and a cross-worker
single-flight lock — a cold zone costs ~45 s, so an in-process LRU meant
divergent per-worker caches, a cold first request after every restart, and no
way to invalidate from outside the process. The `v2:` segment is the
payload-SHAPE version; see §4.2.

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
  // Seven cohorts, WIDEST WINDOW FIRST. RES always ships all seven keys —
  // an empty window arrives as `{ cohort_label, mean_ratio_v: null, n: 0 }`,
  // so the cohort is always PRESENT and the VALUE is what goes null.
  age_cohorts: {
    now:    { cohort_label: string, mean_ratio_v: number | null, n: number },
    last60: { cohort_label: string, mean_ratio_v: number | null, n: number },
    last40: { cohort_label: string, mean_ratio_v: number | null, n: number },
    last20: { cohort_label: string, mean_ratio_v: number | null, n: number },
    last15: { cohort_label: string, mean_ratio_v: number | null, n: number },
    last10: { cohort_label: string, mean_ratio_v: number | null, n: number },
    last5:  { cohort_label: string, mean_ratio_v: number | null, n: number },
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

#### 4.2.1 Amended 2026-08-25 — the seven-cohort ladder

The original contract pinned **four** age cohorts (`now / last20 / last40 /
last60`) with a non-nullable `mean_ratio_v`. Both were wrong. The shipped
endpoint (project_RES #326, #327) returns **seven** cohorts, and the mean is
nullable. This section is the corrected contract; `project_RES` owns the
endpoint and is the authority whenever the two disagree.

**Canonical order — widest window first.** This is the order RES ships, the
order `orderAgeCohorts.ts` plots, and the order `roofs` and `proom` label
their parcel panels:

| cohort key | window | RES `cohort_label` | parcel column | frozen cutoff |
|---|---|---|---|---|
| `now`    | all years | `All years`     | `cz_util_rev_allyrs` | (none) |
| `last60` | 60 years  | `Last 60 years` | `cz_util_rev_60yrs`  | `cy_max >= 1963` |
| `last40` | 40 years  | `Last 40 years` | `cz_util_rev_40yrs`  | `cy_max >= 1983` |
| `last20` | 20 years  | `Last 20 years` | `cz_util_rev_20yrs`  | `cy_max >= 2004` |
| `last15` | 15 years  | `Last 15 years` | `cz_util_rev_15yrs`  | `cy_max >= 2009` |
| `last10` | 10 years  | `Last 10 years` | `cz_util_rev_10yrs`  | `cy_max >= 2014` |
| `last5`  | 5 years   | `Last 5 years`  | `cz_util_rev_5yrs`   | `cy_max >= 2019` |

Reading left to right, the window NARROWS toward more recent construction.

**The two ladders are related but not the same number — do not conflate them.**

- The **parcel columns** `cz_util_rev_*` are a stored monthly artefact
  (`SQL/enrich_derived.sql`): per `(fso_num_2021, cz_local)` group, the
  `percentile_cont(0.5)` **median** utilization of comparable parcels whose
  z-score lies strictly inside (−3, 3), against the **frozen literal** cutoffs
  in the table above.
- `/res_api/zone_stats` `age_cohorts` is computed **on demand** and is an
  `AVG(ratio_v)` — an arithmetic **mean**, no z-score filter — over the same
  zone, filtered `cy_max >= <reference year> − W`. The window is therefore
  **current-year-relative**, not frozen. The reference year is passed in from
  JS so the five concurrent statements of one payload cannot straddle a
  New Year's Eve boundary and cache two different ladders as one object.

That divergence is deliberate and is not to be unified: the endpoint can
honestly mean "the last five calendar years"; the stored columns must not
silently repaint 3.4M rows on 1 January.

**`mean_ratio_v` is `number | null`, and `n` is what tells you whether to
trust it.** `n` is per cohort. The narrower the band the thinner the sample:
the 5-year band exists for only about a third of (municipality, zone) groups,
and about a third of THOSE hold a single parcel. Measured across 200 zones the
mean cohort falls from ~1,600 parcels (all years) to ~59 at 20 years to ~9 at
5 years. Read `n` before trusting a mean. An absent value means **"no data"**
and must never render as zero.

**Values are ratios, not percentages.** Multiply by 100 to display.

**`cz_util_rev_20yrs` did not move.** It is still the buildability-envelope
input behind `gfa_max` / `vol_max`, verified byte-identical across all
3,515,270 unique-EGRID rows. Do not repoint anything at a finer band.

**Transport.** RES answers on `GET` as well as `POST`. room reaches the
endpoint only through its own Vercel Node proxy `api/zone-stats.ts`, which is
`POST`-only (`maxDuration: 60`, 55 s upstream timeout) because a cold zone
exceeds the Edge runtime's wall-time.

**room's client type is deliberately WIDER than the wire shape.**
`ZoneStatsResponse['age_cohorts']` in `src/services/zoneStatsService.ts` marks
`last15` / `last10` / `last5` **optional**. RES always sends them, but a
payload restored from a client cache written before the ladder landed carries
only the four legacy keys, and a required key would be a lie the compiler
cannot catch at runtime. `orderAgeCohorts()` skips whichever keys a payload
does not carry, so a four-cohort payload yields four real points rather than
seven with three phantom entries. A compile-time guard in `orderAgeCohorts.ts`
asserts every key of `age_cohorts` appears in the plot order, so an eighth
cohort cannot be added to the type and then silently never render.

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

Three layers, all keyed on the same **payload-shape-versioned** identity:

- **Memory** — session-scoped `Map<string, ZoneStatsResponse>` in
  `zoneStatsService.ts`, keyed `v2:${fso}:${cz_local}`. `getCachedZoneStats()`
  reads only this layer, synchronously, so a same-session re-click skips the
  skeleton without awaiting anything.
- **IndexedDB** — `IndexedDBCache` on the shared `room-cache` DB
  (`zone-stats` store), same key, no TTL, 50 MB budget with LRU eviction.
  This is what makes the first load after a page reload feel instant.
- **Redis in RES** — `zone_stats:v2:${fso}:${cz_local}`, 30-day TTL (§3.2).

Concurrent requests for one zone are coalesced through an `inFlight` map, so
`prefetchZoneStats()` (fired on map click) and `ZonePanel`'s own
`fetchZoneStats()` share a single round trip instead of paying the cold ~45 s
cost twice.

The `v2:` segment is what retires four-cohort payloads. Bumping the IndexedDB
`DB_VERSION` would NOT: the store carries no TTL and its `onupgradeneeded`
pass only creates missing stores without wiping data, so a pre-ladder entry
would survive every version bump forever. Changing the KEY instead makes the
old entries simply unreachable — they age out through the existing LRU — and
guarantees every `v2:` hit is a payload fetched after the ladder rollout. RES
versions its Redis key the same way and for the same reason, with the segment
placed AFTER the namespace so every existing `zone_stats:*` purge path keeps
matching.

### 5.3 Choropleth fill (Mapbox)

`mapLayers.ts` adds an `interpolate` `fill-color` expression on
`parcel-fill` that reads `feature-state['percentile']` (range 0–1). Parcels
without a feature-state value fall back to a neutral grey fill. The
selected parcel keeps its existing outline highlight.

### 5.4 Percentile-of-value

`statsMath.percentileOfValue(distribution, value)` returns where the
selected parcel's metric falls in the zone distribution (0–100). Drives
both the gauge and the histogram reference lines.

### 5.5 Utilization-over-time ladder

`orderAgeCohorts.ts` owns the plot order and `UtilizationOverTime.tsx` renders
it. Four rules follow from the sparsity documented in §4.2.1:

- **Widest window first.** `now, last60, last40, last20, last15, last10,
  last5`. The original ALL / 20 / 40 / 60 ran the x-axis backwards in time, so
  a densifying zone drew as a FALLING line. Widest-first means moving right
  narrows the window to more recent construction and the reader's
  left-to-right instinct is correct.
- **Degradation is PER POINT, not all-or-nothing.** A cohort with no parcels
  becomes a `null` the line bridges (`connectNulls`); the empty state
  (`panel.zone.over_time_no_data`) appears only when NO cohort has a finite
  mean. Blanking the whole chart on one missing step would blank it for most
  zones. Non-finite means are normalised to `null` first — recharts gaps
  `null` but draws `undefined`/`NaN` as a broken segment. `Tooltip` sets
  `filterNull={false}` so hovering a gap says "no data in this window"
  instead of silently doing nothing.
- **Sample size is drawn, not just told.** `sampleSizeDotRadius(n)` steps the
  dot radius across four bands (≥200, ≥50, ≥10, else), so a 5-year mean over
  two parcels does not carry the visual authority of one over eight hundred.
  Bands, not a continuous ramp — a smooth scale just reads as noise. `n` is
  also spelled out in the tooltip.
- **Tick labels come from the cohort KEY, not `cohort_label`.** RES ships
  English strings whatever `lang` was requested, and seven of them do not fit
  across a 400 px panel. `cohortTickYears()` reduces each key to its bare,
  locale-neutral year count (`null` for `now`, which takes the translated
  `panel.zone.cohort_all`); the unit lives once in the section subtitle.

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
on each. `room` has since grown `npm run verify`
(`typecheck && lint && test && build && test:bundle-syntax`); the cohort
ladder's order, its per-point gapping and its legacy-payload tolerance are
covered by `src/components/charts/UtilizationOverTime.test.ts`.

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
