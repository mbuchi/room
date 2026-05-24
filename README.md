# room

> How densely is this zone actually built — and where does your parcel sit on the distribution?

`room` is a map-first parcel explorer in the SwissNovo suite. Click any parcel
on the map and `room` answers a single, hard question: **what does the real
built density look like in this zoning category, in this municipality, and how
does the selected parcel compare?**

Built on top of the same shared auth, release-notes, AI-assistant, screenshot
capture, and i18n primitives that the rest of the SwissNovo apps use
(`@swissnovo/shared`), so the experience matches the other map-first apps in
the suite.

## What `room` shows

When a parcel is clicked, the right-side panel splits into two sections:

**1. Parcel facts (top)**

- Municipality / FSO number
- Main zoning category (CZ Local)
- Sub-zone / canton-normalised zone (CZ Canton)
- Parcel area (m²)
- Existing building volume (m³)
- Year of construction
- Floor-area proxy
- `ratioV`, `freeV`

**2. Zone distribution (below)**

A zone switcher dropdown auto-selects the parcel's own zoning category, but
you can switch to any other zone in the same municipality to compare. For
the selected zone, `room` shows:

- A boxplot + density curve for the primary utilisation metric, with a
  "you are here" marker at the selected parcel's value
- Six histograms — `ratioV`, `freeV`, `ratioS`, `GFZ`, building height,
  number of floors — each with the same "you are here" reference line
- A 0–100 percentile gauge with a human reading
  ("82% of comparable parcels are utilised more intensively")
- A utilisation-over-time line chart across age cohorts (now /
  last 20 / 40 / 60 years)
- A scatter tab plotting parcel area vs. building volume across all
  comparable parcels in the zone, with a regression line and the selected
  parcel highlighted

The map itself communicates density with a **choropleth fill**: while a
parcel is selected, every other parcel in the same zone+municipality is
shaded by its utilisation percentile (light yellow → deep red).

## Tech stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite 5
- **Styling:** Tailwind CSS 3, PostCSS, Autoprefixer
- **Mapping:** Mapbox GL JS 3, custom `AddressGeoSearch`
- **Charts:** Recharts 2
- **Auth, release notes, AI assistant, profile, login modal, locale selector,
  PRM, signal client:** `@swissnovo/shared` (cross-suite package)
- **Data:** RES API — `POST /res_api/parcel_data` and
  `POST /res_api/zone_stats` (the second endpoint is new and was added for
  `room`)
- **Icons:** `lucide-react`
- **Hosting:** Vercel — auto-deploys from `main` (`vercel.json` ships a Vite
  preset)

## Application structure

```
.
├── api/
│   ├── claire-pois.ts          # Edge proxy used by @swissnovo/shared ClaireAssistant
│   └── signal-collect.ts       # Edge function (telemetry proxy)
├── src/
│   ├── App.tsx                 # I18nProvider › AuthProvider › TourProvider › MapView
│   ├── main.tsx
│   ├── index.css
│   ├── auth/AuthContext.tsx    # Wires @swissnovo/shared AuthProvider
│   ├── components/
│   │   ├── MapView.tsx         # Main map container & state
│   │   ├── Navbar.tsx          # Top bar (geocoder, locate, screenshot, …)
│   │   ├── MapControls.tsx     # Basemap, opacity, 3D toggles
│   │   ├── ZoneInfoPanel.tsx   # Parcel facts header + zone summary
│   │   ├── ZonePanel.tsx       # Scrollable host for all charts
│   │   ├── ZoneSelectorDropdown.tsx
│   │   ├── charts/             # Recharts compositions
│   │   │   ├── BoxplotDensity.tsx
│   │   │   ├── DistributionHistogram.tsx
│   │   │   ├── UtilizationOverTime.tsx
│   │   │   ├── VolumeVsAreaScatter.tsx
│   │   │   └── PercentileGauge.tsx
│   │   ├── CoordinateDisplay.tsx
│   │   ├── LocateButton.tsx
│   │   ├── LocationPermissionModal.tsx
│   │   ├── Logo.tsx
│   │   ├── ScreenshotButton.tsx
│   │   ├── SavedImagesPanel.tsx
│   │   ├── Toast.tsx
│   │   ├── UserMenu.tsx
│   │   └── ZoomControl.tsx
│   ├── data/
│   │   └── releaseNotes.ts     # Per-app changelog (data only — UI from @swissnovo/shared)
│   ├── lib/
│   │   ├── mapConfig.ts
│   │   ├── mapLayers.ts        # Parcel + building layers + choropleth fill expression
│   │   ├── coordTransform.ts
│   │   ├── geocode.ts
│   │   └── signal.ts
│   ├── services/
│   │   ├── imageService.ts
│   │   ├── parcelDataService.ts
│   │   ├── zoneStatsService.ts # POST /res_api/zone_stats client + session cache
│   │   └── statsMath.ts        # percentile-of-value + linear regression helpers
│   └── tour/                   # react-joyride tour, room-specific steps
├── public/
│   ├── og-image.jpg
│   ├── meta-image.png
│   └── silent-callback.html    # Hidden-iframe silent SSO callback (inline postMessage)
├── docs/
│   └── superpowers/specs/2026-05-24-room-design.md
├── index.html
├── vercel.json
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Environment variables

| Variable                     | Scope    | Purpose                                                                 |
| ---------------------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_GEMINI_API_KEY`        | Client   | Gemini API key for the shared `ClaireAssistant`.                        |
| `SIGNAL_COLLECT_API_URL`     | Server   | Upstream URL the Vercel function forwards telemetry to.                 |
| `SIGNAL_COLLECT_API_TOKEN`   | Server   | Bearer token for the upstream API.                                      |

Server-side variables are configured in **Vercel → Project Settings →
Environment Variables** and are not exposed to the browser.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

### Other scripts

```bash
npm run build      # Production build into dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (no JS emitted)
```

## Data sources

- **Parcels:** vector tiles from `res-mbtiles-x.gisjoe.com` (`parcel_2025_07_z12_16`)
- **Building footprints:** vector tiles from `res-mbtiles-footprint-x.gisjoe.com`
- **Parcel + zone data:** RES API (`https://res.zeroo.ch/res_api`)
- **Geocoding & basemaps:** Mapbox

## License

No license file is included. Treat the code as proprietary unless the
maintainer adds a `LICENSE` file.
