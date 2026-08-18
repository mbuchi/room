import {
  ShieldAlert, Palette, Info, Box,
  Sparkles, BarChart3, Activity, Layers, Map, BookOpen, ScatterChart, Image, LayoutPanelTop, Timer, Phone, Bot, PanelsTopLeft, Zap, Database, Languages, Bookmark, Type, BadgeCheck, Code2, MessageSquare, Package, Bug, Camera, LocateFixed,
  ZoomIn, TrendingUp, Filter, Search, MapPin, Maximize2, Smartphone, ExternalLink, Share2, Copy, Link2, Braces,
} from 'lucide-react';
import type { ChangeKind, ChangeItem, Release } from '@aireon/shared';

export type { ChangeKind, ChangeItem, Release };
export { KIND_META } from '@aireon/shared';

// Newest first. Versioning follows SemVer. room is pre-1.0 while the data
// model and visualisations stabilise.
export const RELEASES: Release[] = [
  {
    version: '0.30.0',
    date: 'August 19, 2026',
    codename: 'The zone the municipality uses',
    summary: 'A parcel\'s zone is now the municipal designation ("Dorfzone 2", "Wohnzone, Bauklasse 4"), not the federal main-use category. Suite-wide rule via @aireon/shared v1.177.0.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: MapPin,
        text: 'The zone pill on the Parcel tab, and the zone Claire refers to, now read the municipal designation ("Dorfzone 2", "Wohnzone, Bauklasse 4") instead of the federal main-use category ("Zentrumszonen", "Wohnzonen"). The federal category stays available in the raw JSON view and the data export, and remains a filter, never the label. Where a municipality has no designation on file, the federal category still stands in, and an ordinance cross-reference or a canton code is never shown as the zone.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: BarChart3,
        text: 'The Zone tab no longer repeats the zone above the "Municipal zone type" picker: the picker\'s current value is that same municipal designation, so the line printed the same words twice. The statistics, the cohorts and the choropleth highlight are unchanged and still keyed on the municipal zone type.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text: 'Updated @aireon/shared to v1.177.0, the release that makes the municipal designation the suite default (RES /zone_config answers the same), so every Aireon app prints the same zone for the same parcel. Parcels seen before this release are re-read once so a cached federal label is not shown.',
        prs: [],
      },
    ],
  },
  {
    version: '0.29.2',
    date: 'August 18, 2026',
    codename: 'Raw JSON & Panel Harmony',
    summary: 'Added the raw JSON viewer button for all users and aligned info panel section width and component styling with geopool.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Braces,
        text: 'Added the raw JSON toggle button ("{}") to the panel header actions for all users, matching geopool. Selecting any parcel now allows toggling the full structured RES and feature JSON data.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text: 'Aligned the info panel width to the 420px suite standard (matching geopool and ParcelPanelShell) with 436px dock offset. Standardized section cards and data pill groups for consistent width and visual hierarchy.',
        prs: [],
      },
    ],
  },
  {
    version: '0.29.1',
    date: 'August 18, 2026',
    codename: 'Same zone, same words',
    summary: 'Claire now names a parcel\'s zone the way the Parcel tab does.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text: 'Claire now refers to a parcel\'s zone by the same harmonized label the panel shows ("Wohnzonen"), instead of quoting the municipal designation next to it. The municipal zone type is still passed along, but only as a secondary detail, so an answer never leads with a label the app itself no longer prints (@aireon/shared v1.173.3).',
        prs: [],
      },
    ],
  },
  {
    version: '0.29.0',
    date: 'August 18, 2026',
    codename: 'One zone',
    summary: 'A parcel now shows one zone, the harmonized federal category, the same label every other Aireon app prints for it. The municipal zone type is still what the statistics compare against, and is now labeled as exactly that.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: MapPin,
        text: 'The Parcel tab shows a single zone pill with the harmonized federal category ("Wohnzonen") instead of the municipal and cantonal designations side by side. Where a canton has not delivered harmonized data yet (all of Zürich today), the municipal designation stands in, so the pill is never blank for a zoned parcel, and an ordinance cross-reference or a canton code is never shown as the zone.',
        prs: [],
      },
      {
        kind: 'changed' as ChangeKind,
        icon: BarChart3,
        text: 'The Zone tab prints the parcel\'s zone above the picker, and the picker itself is now labeled "Municipal zone type": it selects the municipal zone (for example "Wohnzone, Bauklasse 4") that the distribution charts and percentiles are computed over. Those statistics have not changed, only what they are called, so the charts never claim to describe a broader category than they do.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text: 'Updated @aireon/shared to v1.173.1, which carries the suite-wide zone rule so every Aireon app resolves the same label from the same parcel record.',
        prs: [],
      },
    ],
  },
  {
    version: '0.28.1',
    date: 'August 17, 2026',
    codename: 'Word order',
    summary: 'The data-vintage line in the About dialog now reads correctly in German, French and Italian.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Languages,
        text: 'The line in the About dialog that gives the date of the parcel snapshot was put together in English word order and then translated piece by piece, so the German version read "Juli 2025 Stand" instead of "Stand Juli 2025", with French and Italian wrong in the same way. Each language now writes the whole sentence itself, so it reads naturally everywhere. English was never affected.',
        prs: [],
      },
    ],
  },
  {
    version: '0.28.0',
    date: 'August 17, 2026',
    codename: 'How old is this number?',
    summary: 'The About dialog now tells you which parcel snapshot room is showing and when each layer behind it was last calculated.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: Database,
        text: 'About now names the parcel snapshot room is reading and the date it was last calculated, so you can see at a glance how current the figures on screen are without having to ask.',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: Info,
        text: 'A "Pipeline details" disclosure in the same dialog opens a dated list of every enrichment layer behind a parcel, including each federal source’s own vintage, so you can tell which part of the data is fresh and which part is waiting on its next federal release.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Box,
        text: 'Every building volume was recalculated on August 17, 2026. That also refreshed the utilization figures, which were still being derived from volumes computed before duplicate building reconstructions were removed.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text: 'Updated @aireon/shared to v1.172.1, which carries the data-vintage line in the About dialog.',
        prs: [],
      },
    ],
  },
  {
    version: '0.27.1',
    date: 'August 14, 2026',
    codename: 'The right address for the right parcel',
    summary: 'The address shown when you right-click a parcel now belongs to that parcel, and not to a neighbor.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: MapPin,
        text: 'Right-clicking a parcel on the map used to look up the closest address to the exact spot you clicked. In built-up areas that often picked an address from the plot next door, showed the same address on two neighboring parcels, or showed two different addresses for one parcel depending on where you clicked it. The address is now looked up from the parcel itself, so it no longer depends on where you click and cannot borrow a neighbor’s address.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text: 'Updated @aireon/shared to v1.165.0, which carries the corrected address lookup. room hands the map menu the parcel details it already has, so in almost every case the address now appears with no extra network request at all.',
        prs: [],
      },
    ],
  },
  {
    version: '0.27.0',
    date: 'August 14, 2026',
    codename: 'New map engine',
    summary: 'room now runs on the latest version of its mapping engine. Everything on the map works exactly as before.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text: 'The engine that draws the map has been updated to its newest major version. This is a maintenance update: panning, zooming, parcel selection, the density colors, the 3D buildings, the basemap switcher and map screenshots all behave exactly as they did before. Keeping the engine current means room picks up its performance work and bug fixes as they land.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text: 'Updated @aireon/shared to v1.163.0, which carries the shared pieces the new map engine needs.',
        prs: [],
      },
    ],
  },
  {
    version: '0.26.0',
    date: 'August 14, 2026',
    codename: 'The map loads on demand',
    summary: 'room no longer waits for the mapping library before it shows anything. The navbar, the search box and the map controls are ready sooner.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'The mapping library made up about half of everything the browser had to download before room could put anything on screen, even though it is only needed once the map itself draws. It now loads on demand, alongside the map style, instead of blocking everything ahead of it. First-load downloads drop from 460 KB to 245 KB, so on a slow connection the navbar, the search box and the map controls appear noticeably earlier, and the map still arrives at the same moment as before.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text: 'Hardened the map area against a class of styling conflict that could leave it blank with no error message, by pinning its size so it can no longer collapse.',
        prs: [],
      },
    ],
  },
  {
    version: '0.25.1',
    date: 'August 12, 2026',
    codename: 'No more theme flash',
    summary: 'Fixes a brief flash of the light theme when opening room on a device set to light mode.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Palette,
        text: 'Updated @aireon/shared to v1.159.2. If your device is set to light mode, opening room for the first time no longer paints the page light and then flips it to dark: the pre-paint check now matches how room actually picks its theme, so the dark default is correct from the very first frame.',
        prs: [],
      },
    ],
  },
  {
    version: '0.25.0',
    date: 'August 12, 2026',
    codename: 'Faster first paint',
    summary: 'room starts painting before any JavaScript runs, fonts load from our own servers instead of a third party, and repeat visits reuse cached files.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Opening room now shows the dark theme and the page outline immediately, before any code has loaded. Previously the screen stayed blank until the whole bundle had downloaded.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text: 'Fonts are served from room itself rather than fetched from Google, which removes a third-party request that was delaying the first paint on every visit.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Timer,
        text: 'Return visits are faster: versioned files are now cached permanently by the browser instead of being re-checked on every load, and the map style is reused across visits.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text: 'room no longer waits on an access check before showing anything, so a slow or unreachable backend can never leave the page blank.',
        prs: [],
      },
    ],
  },
  {
    version: '0.24.2',
    date: 'August 12, 2026',
    codename: 'Quiet all the way down',
    summary: 'Every skeleton layout now honors the Hub loading policy, including placeholders rendered by shared components.',
    items: [{
      kind: 'fixed' as ChangeKind,
      icon: Sparkles,
      text: 'Updated @aireon/shared to v1.158.0. Whole loading shells and direct skeleton primitives now stay absent under the default-off Hub policy; when an administrator enables skeletons, each complete layout appears once at the configured threshold without a second delay or duplicate spinners.',
      prs: [],
    }],
  },
  {
    version: '0.24.1',
    date: 'August 12, 2026',
    codename: 'Calm loading by default',
    summary: 'Quick loads now stay visually quiet; the Hub administrator can optionally enable an immediate spinner and delayed skeletons for longer waits.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Sparkles,
      text: 'Loading skeletons and the shared minimal spinner are off by default across Aireon. If the Hub administrator enables them, this app follows the suite-wide spinner setting and only reveals its existing skeleton layouts after the configured threshold.',
      prs: [],
    }],
  },
  {
    version: '0.24.0',
    date: 'August 12, 2026',
    codename: 'See the map through the data',
    summary: 'A new overlay opacity slider fades the parcel and building layers so the map underneath stays readable, and the setting travels in shared links.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Layers,
        text: 'The basemap panel now has an overlay opacity slider. It fades everything room draws on the map, the parcel fills and outlines and the building footprints and 3D masses, so you can read street names and landmarks underneath without switching the layers off. The basemap itself never fades.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Link2,
        text: 'The setting is part of a shared view: opening a link with ?opacity=40 starts room with the overlay at 40 percent, and moving the slider updates the address bar so a copied link reproduces exactly what you were looking at. At 100 percent the parameter is left out of the link entirely.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: MapPin,
        text: 'Hover feedback and the highlight around the selected parcel keep their full strength at any overlay opacity, so the parcel you opened stays visible. The slider multiplies the parcel and building transparency you already set rather than replacing them, and it survives a basemap change.',
        prs: [],
      },
    ],
  },
  {
    version: '0.23.12',
    date: 'August 11, 2026',
    codename: 'Shared data client',
    summary: 'Requests to the suite backend now go through the shared typed RES API client. Nothing changes in how the app looks or behaves.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Database,
      text: 'Screenshot uploads and the saved-images gallery now ride the suite-wide typed RES API client from @aireon/shared, and every backend proxy derives its URL from the shared base constant - compile-time checked requests and one auth story, with identical behavior on screen.',
      prs: [],
    }],
  },
  {
    version: '0.23.11',
    date: 'August 11, 2026',
    codename: 'Quiet starts',
    summary: 'Startup now stays visually calm during quick access and app initialization; the full loading skeleton appears only after 2.5 seconds.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Sparkles,
      text: 'Startup now stays visually calm during quick access and app initialization; the full loading skeleton appears only after 2.5 seconds.',
      prs: [],
    }],
  },
  {
    version: '0.23.10',
    date: 'August 11, 2026',
    codename: 'Fresh shared foundation',
    summary: 'The shared Aireon library moved up to its latest release, keeping room current with the rest of the suite.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Package,
      text: 'Updated the shared Aireon library to v1.152.0. This release carries groundwork for faster map tiles and in-browser analytics used across the suite, so room stays aligned with upcoming platform improvements without any change to how it works today.',
      prs: [],
    }],
  },
  {
    version: '0.23.9',
    date: 'August 11, 2026',
    codename: 'Right words, right language',
    summary: 'The compare button speaks your language again instead of a neighboring one.',
    items: [{
      kind: 'fixed' as ChangeKind,
      icon: Languages,
      text: 'The compare-button release pasted its three labels (add, remove, tray full) into the wrong language blocks, so French users saw them in German and German users in French. Each language now carries exactly its own wording for English, German, French and Italian.',
      prs: [],
    }],
  },
  {
    version: '0.23.8',
    date: 'August 9, 2026',
    codename: 'Open here forgets the old parcel',
    summary: 'Opening a saved parcel no longer leaves the previous parcel named in the link.',
    items: [{
      kind: 'feature' as ChangeKind,
      icon: Bookmark,
      text: 'Added parcel compare button to panel header action bar per PANEL_ACTIONS_STANDARD.',
      prs: [],
    }, {
      kind: 'fixed' as ChangeKind,
      icon: Link2,
      text: 'Jumping to a saved parcel already kept your language, theme and basemap, but the address and parcel identifiers of the parcel you came from stayed in the link. That made a shared link name one parcel in its text and another in its coordinates. Those identifiers are now cleared on the way.',
      prs: [],
    }],
  },
  {
    version: '0.23.7',
    date: 'August 9, 2026',
    codename: 'A faster workshop',
    summary: 'room is built with a new, much faster engine, and it now arrives as smaller cached pieces.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Zap,
      text: 'room is now assembled with Vite 8, a single much faster build engine. Preparing a new version of room dropped from 4.5 seconds to 1.5 seconds, the stylesheet got a little smaller, and room is delivered as more but smaller pieces at the same total size. That last part is the one you may notice: when we ship an update, your browser only re-downloads the pieces that actually changed instead of the big ones it already had. Nothing about how room looks or works has changed.',
      prs: [],
    }],
  },
  {
    version: '0.23.5',
    date: 'August 9, 2026',
    codename: 'Unified WGS84 pills',
    summary: 'Coordinate pill wording is standardized to WGS84 with equal flex width sizing.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Code2,
      text: 'Standardized coordinate identifier pill wording to WGS84 and equalized pill widths side-by-side.',
      prs: [],
    }],
  },
  {
    version: '0.23.4',
    date: 'August 9, 2026',
    codename: 'The link remembers the view',
    summary: 'The address bar now mirrors your language, theme, basemap and 3D camera, so a copied link reopens the exact view.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Link2,
      text: 'Switching language, flipping the theme, picking a basemap or turning on 3D now updates the current URL alongside the map position, and so does every map move. Copying the link from the address bar or from Share this view reproduces the whole view for whoever opens it. The parameters stay ephemeral, so they never overwrite the saved preferences of the person opening the link.',
      prs: [],
    }],
  },
  {
    version: '0.23.3',
    date: 'August 9, 2026',
    codename: 'One quiet chip',
    summary: 'Panel action buttons now share one subtle chip background instead of a mix of filled and floating icons.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Palette,
      text: 'The Track, Export and raw-JSON buttons in the parcel panel header now rest on the suite-standard translucent chip surface, so the action row reads as one calm group in both themes. Stateful accents (tracked, active, error) keep their tinted chips.',
      prs: [],
    }],
  },
  {
    version: '0.23.2',
    date: 'August 9, 2026',
    codename: 'Parcel data, downloadable',
    summary: 'The selected parcel’s planning evidence can now be downloaded from the panel header.',
    items: [{
      kind: 'new' as ChangeKind,
      icon: Package,
      text: 'Added responsive PDF, JSON, CSV and GeoJSON exports containing room’s RES enrichment and raw parcel feature, plus the canonical identifier, full address, clicked coordinates and parcel polygon.',
      prs: [],
    }],
  },
  {
    version: '0.23.1',
    date: 'August 9, 2026',
    codename: 'Address in the link',
    summary: 'Confirmed address and right-click selections now keep the map URL synchronized with the exact location and address, ready to reload or share.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Link2,
      text: 'Selecting an address or loading a location from the right-click menu now writes canonical lat, lng, zoom, and q parameters into the current URL.',
      prs: [],
    }],
  },
  {
    version: '0.23.0',
    date: 'August 9, 2026',
    codename: 'Deep-link URL parameters',
    summary: 'room now supports the suite-wide deep-link URL contract: mode=screenshot/embed/kiosk, tour=silent/start, theme, lang, basemap and 3D view all work from the address bar.',
    items: [{
      kind: 'new' as ChangeKind,
      icon: Link2,
      text: 'Adopted the suite-standard deep-link URL parameters: mode=screenshot|embed|kiosk hides chrome for clean captures and embeds, tour=silent|start controls the onboarding tour, and theme=dark|light, lang=en|fr|de|it, basemap=<id> and view=3d let a shared link open room in a specific appearance. Every override is ephemeral - it never overwrites your saved preferences.',
      prs: [],
    }],
  },
  {
    version: '0.22.2',
    date: 'August 8, 2026',
    codename: 'Every search counts',
    summary: 'Right-click map searches now show up under Recent searches, just like address-bar searches.',
    items: [{
      kind: 'fixed' as ChangeKind,
      icon: Search,
      text: 'Right-click map searches now appear in Recent searches, matching the address bar and synced across Aireon apps.',
      prs: [],
    }],
  },
  {
    version: '0.22.1',
    date: 'August 8, 2026',
    codename: 'EGRID copy',
    summary: 'The right-click map menu can now copy the federal parcel identifier (EGRID) straight to your clipboard.',
    items: [{
      kind: 'new' as ChangeKind,
      icon: Copy,
      text: 'Right-click map menu: Copy parcel ID (EGRID) copies the federal parcel identifier (CH...) to the clipboard, ready to paste into any app or search that speaks EGRID.',
      prs: [],
    }],
  },
  {
    version: '0.22.0',
    date: 'August 8, 2026',
    codename: 'Address-first context menu',
    summary: 'The right-click menu now leads with the street address and its primary action is named for what room does: Check zoning here.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: MapPin,
      text: 'The right-click menu now leads with the street address and identifies the parcel below it, so you see where you are before what the parcel is called.',
      prs: [],
    }, {
      kind: 'changed' as ChangeKind,
      icon: Type,
      text: 'The menu\'s primary action is now labeled "Check zoning here", telling you what room will show for the spot instead of the generic load wording.',
      prs: [],
    }],
  },
  {
    version: '0.21.1',
    date: 'August 8, 2026',
    codename: 'No forced sign-in',
    summary: 'Signed-out visitors are never redirected to the sign-in page anymore: the app always opens directly, and signing in stays your choice.',
    items: [{
      kind: 'changed' as ChangeKind,
      icon: Sparkles,
      text: 'Opening room while signed out used to bounce some visitors through the account service, and could even strand you on its sign-in page when an old session had expired. That automatic redirect is gone across the whole Aireon suite: room now always loads anonymously, and you only ever see the sign-in screen after choosing Sign in yourself.',
      prs: [],
    }],
  },
  {
    version: '0.21.0',
    date: 'August 7, 2026',
    codename: 'Compact pills',
    summary: 'The parcel tab now reads as compact data pills instead of stacked label/value rows.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: LayoutPanelTop,
      text: 'Parcel panel data now reads as compact pills, tightly stacked and always in the same order, so the zoning, location and building facts scan faster than the old four-card layout. The utilization and headroom bars underneath are unchanged.',
      prs: [],
    }],
  },
  {
    version: '0.20.10',
    date: 'August 6, 2026',
    codename: 'One-row identity',
    summary: 'Parcel identity stays compact, Claire keeps its clearance, and Residential type keeps every parcel selectable.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Type,
      text: 'The EGRID and coordinate chips under the parcel address now use the suite-shared identifier row. The chip type scales fluidly with the panel width, so both chips share a single line instead of stacking, and the copy buttons still carry the full values.',
      prs: [],
    }, {
      kind: 'fixed' as ChangeKind,
      icon: Filter,
      text: 'Residential type now opens on All for every user after the upgrade, including browsers that had retained Single-unit from the former default; choices made from now on remain saved. The unit filter only changes the visible parcel styling, so every parcel stays hoverable and selectable even when it falls outside the active group.',
      prs: [],
    }, {
      kind: 'improved' as ChangeKind,
      icon: MapPin,
      text: 'The line under the parcel address now shows the postal code next to the municipality name, matching the locality subtitle used across the Aireon suite.',
      prs: [],
    }, {
      kind: 'fixed' as ChangeKind,
      icon: Bot,
      text: 'When a parcel panel is open on desktop, the Claire launcher now keeps the suite standard clearance from the panel and the zoom controls instead of sitting flush with the zoom column.',
      prs: [],
    }],
  },
  {
    version: '0.20.9',
    date: 'August 6, 2026',
    codename: 'Actions in suite order',
    summary: 'The parcel panel header actions now follow the suite-wide order: Track first, then raw data.',
    items: [{
      kind: 'improved' as ChangeKind,
      icon: Bookmark,
      text: 'The icon actions beneath the parcel address now match the rest of the Aireon suite: the Track bookmark comes first, followed by the raw-data toggle for admins, and close stays beside the heading. Nothing else about the panel changed.',
      prs: [],
    }, {
      kind: 'improved' as ChangeKind,
      icon: Filter,
      text: 'Residential type now offers three focused choices, with All selected by default for new and reset visits. All combines both unit groups without a dwelling-count filter, Multi-unit contains only parcels with two or more dwellings, and every other parcel is grouped under Single-unit. Existing saved choices remain intact, and wider compact segments keep every label on one line.',
      prs: [],
    }],
  },
  {
    version: '0.20.8',
    date: 'August 5, 2026',
    codename: 'Sign in, stay put',
    summary: 'Signing in now keeps the current view and parcel analysis intact.',
    items: [{
      kind: 'fixed' as ChangeKind,
      icon: ShieldAlert,
      text: 'Sign in and Create account now complete in a separate secure window while room stays mounted. The map position, zoom, selected parcel, active panel tab, filters and other in-progress state remain exactly where the user left them.',
      prs: [],
    }],
  },
  {
    version: '0.20.7',
    date: 'August 5, 2026',
    codename: 'Maps at a glance',
    summary: 'The basemap chooser now opens with its map previews ready immediately.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Image,
        text:
          'The six built-in basemap previews are now compact images prepared in advance instead of six miniature maps generated each time you open the chooser. The gallery appears immediately, uses no extra map connections or graphics contexts, and still shows the same Zurich comparison for every style.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.6',
    date: 'August 5, 2026',
    codename: 'One parcel card across Aireon',
    summary: 'The map-click panel now follows the same satellite-first parcel-card composition as roofs.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The selected parcel now opens with the satellite image and address as one compact identity row, including the close button beside the heading. Raw data and Track remain directly underneath as icon actions, followed by a single copyable EGRID and Lat/Lng row. The zoning, parcel, market, massing, compare and help tabs are unchanged.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.5',
    date: 'August 5, 2026',
    codename: 'Trimmed instructions',
    summary: 'Claire runs on a revised set of internal instructions, and room moves onto the current shared Aireon libraries.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Bot,
        text:
          'Claire, the assistant built into room, works from a set of internal instructions that shape how it answers questions about a parcel. Those instructions have been rewritten and trimmed so that only what Claire actually needs in your browser is sent there, and the rest stays on the server. What Claire says and how it behaves are unchanged. The same update moves room onto the current shared Aireon libraries, which carry the latest refinements to the navigation bar and the parcel panel.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Opening room now stays signed out by default even when the browser carries an Aireon SSO hint: it does not redirect to Zitadel or open a sign-in prompt automatically. The public app remains available without an account, while Sign in in the account menu still starts the normal interactive login when requested.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.4',
    date: 'August 4, 2026',
    codename: 'Tools for the toolmakers',
    summary: 'The raw data view in the parcel panel is now reserved for administrator accounts.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: ShieldAlert,
        text:
          'The braces button in the parcel panel header opens a raw data view built for developers, listing the parcel record exactly as room receives it. It now appears only for administrator accounts, alongside the Compare tab it belongs with. Everyone else sees the same parcel through the regular tabs, where each figure is labeled and explained. If an administrator signs out with the view open, room closes it right away.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.3',
    date: 'August 4, 2026',
    codename: 'Room for the address',
    summary: 'The parcel panel now gives the address a full line of its own.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The buttons at the top of the parcel panel (raw data, Track and close) have moved up onto their own row. Before, they sat next to the address and squeezed it into a narrow column, so a longer street name broke apart across several lines. The address now has the full width of the panel and stays readable. The panel also stops shifting those buttons around while the address is still loading.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.2',
    date: 'August 3, 2026',
    codename: 'Clear confirmation',
    summary: 'The confirmation that appears after you copy a share link now lets the map show through.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Share2,
        text:
          'Using Share this view in the account menu used to drop a solid green bar over the map. That confirmation is now translucent frosted glass, so the zone map behind it stays visible, and its wording sits in a darker, sharper tone that is easier to read at a glance.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.1',
    date: 'August 2, 2026',
    codename: 'Honest bookmark',
    summary: 'Fixed the Track button showing a parcel as untracked after an untrack that did not go through.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Bookmark,
        text:
          'If removing a tracked parcel failed, for example because the connection dropped, the Track button flipped to the untracked look even though the parcel was still saved in your proom workspace. Clicking it again then saved a second copy. The button now stays marked as tracked, shows the error, and retries the removal instead.',
        prs: [],
      },
    ],
  },
  {
    version: '0.20.0',
    date: 'August 2, 2026',
    codename: 'One level',
    summary:
      'The parcel panel is now five plain tabs instead of two tabs with more tabs inside them, and the address block carries the parcel identity for every one of them.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: PanelsTopLeft,
        text:
          'The panel tabs are now Zone, Parcel, Market, Massing and FAQ. Everything is one click from the top instead of buried under two levels of tabs or stacked below the parcel facts where most people never scrolled.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: ScatterChart,
        text:
          'The Zone tab shows every chart in one scroll. The parcel-area-vs-built-volume scatter used to hide behind a second row of tabs; it is now simply the last chart, after the percentile gauge, the boxplot, the histograms and the utilization-over-time line.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The address, municipality, EGRID and Lat/Lng now sit in one compact block at the top of the panel and stay there whichever tab you are on, so you never lose track of which parcel you are reading.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: TrendingUp,
        text:
          'City market figures moved out of the parcel facts into their own Market tab, and the 3D buildable massing simulator into its own Massing tab. Massing now loads only when you open it, so selecting a parcel is lighter.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: MessageSquare,
        text:
          'The new FAQ tab answers what room calculates, where the zoning data comes from and whether the utilization figure is binding, and offers Ask Claire right there for anything it does not cover.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.16',
    date: 'August 2, 2026',
    codename: 'Track up top',
    summary:
      'The Track button moved onto the panel action bar, and the in-panel Open in menu retired in favor of the navbar one.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bookmark,
        text:
          'Track this parcel is now a compact bookmark toggle on the panel action bar, next to the raw-data and close buttons, matching the rest of the Aireon suite. It replaces the wide bar that sat under the panel, so the parcel facts get that space back.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: ExternalLink,
        text:
          'The Open in menu inside the parcel panel is gone. To jump to another Aireon app at this parcel, use the Open with menu beside the address in the top bar, which does the same thing from anywhere.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.15',
    date: 'July 31, 2026',
    codename: 'Solid volumes',
    summary:
      'The 3D buildings now start at the new suite-wide default of 75% opacity.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Box,
        text:
          'Every Aireon app that draws 3D buildings now starts them at the same 75% opacity, so the masses look identical whichever app you open. Here that is a change from 85%. The slider still adjusts it at any time.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.14',
    date: 'July 31, 2026',
    codename: 'Hub, new tab',
    summary: 'Links to the Aireon hub now open in a new browser tab.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ExternalLink,
        text:
          'Links to the Aireon hub, including the See all Aireon applications button in the About dialog and the Aireon badge in the navbar, now open in a new browser tab so your work in room stays open.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.13',
    date: 'July 31, 2026',
    codename: 'Tooltip manners',
    summary: 'Toolbar tooltips now close when you click a button instead of staying pinned open.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Bug,
        text: 'Toolbar tooltips no longer stay open after clicking a button.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.12',
    date: 'July 26, 2026',
    codename: 'Soft landing',
    summary: 'Devices without WebGL now get a clear explanation instead of a blank map area.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: ShieldAlert,
        text:
          'On a browser or device where WebGL is turned off or unavailable, the map engine cannot start at all. room used to leave a silent, empty dark area where the map should be, with nothing to explain it. It now checks for WebGL support before starting the map and shows a clear "Map unavailable on this device" notice explaining that the browser does not support WebGL, and suggesting a different browser or turning hardware acceleration back on.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Bug,
        text:
          'This browser limitation is no longer filed as an application error in our bug tracker, so genuine defects are easier to spot.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.11',
    date: 'July 22, 2026',
    codename: 'Softer landing',
    summary: "Claire's AI assistant gains a lighter Gemini fallback tier for even faster responses under load.",
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          "Claire's AI assistant now has an additional fast fallback model (Gemini 3.5 Flash Lite) between its primary and lighter-weight models, for more resilient answers when demand is high.",
        prs: [],
      },
    ],
  },
  {
    version: '0.19.10',
    date: 'July 22, 2026',
    codename: 'Sharper Claire',
    summary: "Claire's AI assistant now runs on Gemini 3.6 Flash for faster, sharper answers.",
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: "Claire's AI assistant now runs on Gemini 3.6 Flash, our latest model, for faster and sharper answers about your parcel.",
        prs: [],
      },
    ],
  },
  {
    version: '0.19.9',
    date: 'July 22, 2026',
    codename: 'Know before you leap',
    summary: 'The "Open in" menu now says what each app actually does, in your language.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ExternalLink,
        text:
          'The "Open in" menu at the end of the parcel card no longer lists bare app names. Every target now carries a short line saying what it is for, such as "boom" with "Swiss Noise Map & Analysis", so you can pick the right tool for the parcel you are looking at without opening three of them to find out.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text:
          'Those descriptions follow the language you picked for room. Switch between German, English, French, and Italian and the "Open in" menu switches with it, instead of leaving you with English labels in an otherwise translated panel.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.8',
    date: 'July 22, 2026',
    codename: 'Calm actions',
    summary: 'Ask Claire and "Open in" now sit side by side as equal, quietly styled buttons at the end of the parcel card.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Ask Claire no longer shouts. The bright orange button at the end of the parcel card is now a calm neutral one, with only the sparkle icon keeping its amber tint, so it sits alongside the rest of the panel instead of pulling your eye away from the data.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The "Open in" launcher gets its label back and an equal half of the row. On phones, Ask Claire and Open in now split the width evenly as matching buttons, so you can read what the second one does instead of guessing at a small icon square, and both keep a comfortable tap area.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.7',
    date: 'July 22, 2026',
    codename: 'One line, always',
    summary: 'The parcel card header is tighter on phones, and the EGRID and coordinates now stay on a single line.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Smartphone,
        text:
          'The EGRID and Lat/Lng chips under the parcel address no longer split their values across several lines on a phone. Each chip now claims the width its value actually needs, so on a narrow screen they stack one above the other and both read on a single line, while wider panels keep them side by side as before. Coordinates still show and copy at full six-decimal precision.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The parcel panel header is more compact on phones. The "{}" raw-data and close buttons keep their comfortable tap area without the button boxes themselves growing, so the header reclaims the space it was wasting and the tab switcher beside them stays roomy.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.6',
    date: 'July 21, 2026',
    codename: 'Actions join the scroll',
    summary: 'The Ask Claire and "Open in" actions now close out each panel tab as the last scrollable section instead of a bar pinned to the bottom edge.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Smartphone,
        text:
          'On phones, Ask Claire and the Open in launcher now sit at the end of the parcel details, reached by scrolling, instead of a bar fixed to the bottom edge. The same applies to the full-width Open in row on desktop, while the Track button keeps its always-visible spot below the panel.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.5',
    date: 'July 21, 2026',
    codename: 'Card, standardized',
    summary: 'The parcel panel adopts the suite mobile data-card standard: copyable EGRID and Lat/Lng chips plus a cross-app "Open in" menu in the footer.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text:
          'The parcel facts header now follows the suite data-card standard. The EGRID moved out of the title block into a pair of half-width copyable chips under the address: EGRID on the left and the parcel coordinates (Lat/Lng) on the right, each with a one-tap copy button.',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: MapPin,
        text:
          'A new "Open in" menu in the parcel panel footer hands the selected parcel off to another Aireon map app at the same spot. On phones it sits as a compact button beside the Ask Claire action in a single split row; on desktop it is a full-width row under the Track button.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.4',
    date: 'July 20, 2026',
    codename: 'Under the hood',
    summary: 'The parcel panel now has a developer "raw JSON" toggle that shows the exact data behind a clicked parcel.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: Code2,
        text:
          'A new "{}" button in the parcel panel header reveals the raw structured data behind the selected parcel: the full RES response that feeds the charts and facts, alongside the raw map-tile properties for that parcel. The JSON is syntax highlighted and has a one-click Copy button, so it is easy to inspect exactly what room knows about a parcel or grab it for a bug report. Toggle it off to return to the normal charts and facts view.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.3',
    date: 'July 19, 2026',
    codename: 'No more surprise zoom',
    summary: 'Tapping the address search on a phone no longer zooms the page in and leaves it stuck wider than the screen.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Smartphone,
        text:
          'Stopped iOS Safari from auto-zooming the page when the address search is focused on phones, which left the page stuck wider than the screen. Search text is now 16px on phones and the page scale stays at 100%. The zone filter box in the parcel panel gets the same treatment.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.2',
    date: 'July 19, 2026',
    codename: 'Sheet, full height',
    summary: 'Parcel details now open full height on phones, with a drag-down gesture to dismiss.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Smartphone,
        text:
          'Parcel details now fill the screen below the top bar on phones, and the top bar stays visible and usable while the panel is open. The sheet used to open at half height, so the charts always needed an extra tap on the grab handle; it now opens fully expanded every time you pick a parcel. The handle still collapses it to a half-height peek when you want the map behind it.',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: Maximize2,
        text:
          'You can now dismiss the parcel sheet by dragging its grab handle downward, the same gesture the other Aireon apps use. The sheet follows your finger and closes once you pull it far enough; a short pull springs it back. On phones with a home indicator, the Save to PRM bar now sits clear of it.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.1',
    date: 'July 18, 2026',
    codename: 'A picker that fits',
    summary: 'The map-style picker now follows the shared phone-width standard.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Smartphone,
        text: 'Updated to @aireon/shared v1.110.1 so the basemap picker uses the shared compact phone-width rule.',
        prs: [],
      },
    ],
  },
  {
    version: '0.19.0',
    date: 'July 18, 2026',
    codename: 'Claire speaks zoning',
    summary: 'Claire now opens with starter questions written for room instead of the same generic set every Aireon app shared.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: Bot,
        text:
          'Opening Claire used to greet you with seven all-purpose suggestions that were identical in every Aireon app, so none of them asked the questions room is actually built to answer. Her starter chips are now written for this app: "Utilization headroom" estimates how much of the volume your zone allows is already used and how much is left, "Decode this zone" translates the local zone code into the density and height limits it normally carries, and "Value of free volume" puts a rough CHF figure on the unused building volume. "Density metrics", "Densify this site" and "Already over-built" round out the set. Claire also carries a short briefing on what room measures, so her answers stay in the language of utilization ratios, free volume in m3, site coverage and GFZ rather than drifting into general property talk.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.7',
    date: 'July 18, 2026',
    codename: 'Small print, readable',
    summary: 'The faintest labels on the density legend and the parcel panel are legible again in dark appearance.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Type,
        text:
          'In dark appearance, the smallest labels on the density legend — the "median" reading under the colour bar and the note explaining the 100% allowance marker — were printed so dark against the translucent legend that they were close to invisible, and they vanished altogether wherever a bright aerial basemap showed through. Both now use the same readable grey as the "you are here" line just above them.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Type,
        text:
          'Two faint labels in the parcel panel had the same problem: the "comparable parcels" heading above the nearby-parcels list, and the small date range printed beside each market-data card title. Both are now legible against the panel in dark appearance.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.6',
    date: 'July 18, 2026',
    codename: 'One address, both ways',
    summary: 'Clicking a parcel now writes the same full address into the navbar search as picking that address from the dropdown.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: MapPin,
        text:
          'Choosing an address from the navbar search filled the box with the full address ("Nüschelerstrasse 30 8001 Zürich"), but clicking the very same parcel on the map wrote only the street and house number — so the two ways of reaching one parcel left two different strings in the same field. A map click now shows the complete address, postcode and town included, exactly as the search dropdown writes it. Parcels that genuinely have no address, such as courtyards, roads and unbuilt land, leave the field empty rather than showing a lone town name.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.5',
    date: 'July 18, 2026',
    codename: 'Controls stay clear',
    summary: 'The floating map controls no longer disappear behind the parcel panel, and the zone filter box shows its hint text again.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Layers,
        text:
          'On desktop screens, opening a parcel slid the parcel panel over the floating map control buttons on the right, leaving the layer and map-settings controls covered and unclickable until you closed the parcel. The control stack now steps aside to sit clear of the panel, so those buttons stay reachable while you inspect a parcel.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Filter,
        text:
          'In the zone picker, the "filter zones" hint inside the search box was so dim against the dark dropdown that the box looked simply empty, with no sign you could type in it. The hint is now legible in both dark and light appearance.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.4',
    date: 'July 18, 2026',
    codename: 'Address stays put',
    summary: 'The navbar search now names the parcel currently open in room.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: MapPin,
        text:
          'After an address or parcel is selected, its current address stays visible in the navbar search while the parcel facts and zone workspace are open. Changing parcels updates the field, and closing the active parcel clears it, so the search bar always identifies what you are viewing.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.3',
    date: 'July 18, 2026',
    codename: 'Readable on glass',
    summary: 'Secondary text is now properly readable on the frosted and liquid glass panels, and the Floor lines switch in the massing simulator draws correctly again.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Type,
        text:
          'With the Frosted or Liquid glass panel style, the quieter grey text such as labels, units, captions and hints was washed out and hard to read, because the panels are see-through and the map underneath bled into the letters. Those labels now get a stronger, higher-contrast shade on glass in both light and dark appearance. On a dark liquid-glass panel the contrast of this text nearly doubled, taking it from below the accessibility minimum to comfortably above it.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Box,
        text:
          'In the buildable massing simulator, switching Floor lines on made the toggle knob jump right outside the switch instead of sliding to its end, so the control looked broken and it was hard to tell whether floor lines were on or off. The knob now stays inside the switch and moves between its two positions as expected.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.2',
    date: 'July 18, 2026',
    codename: 'Basemap names in full',
    summary: 'Basemap names no longer get cut off in the gallery on phones and tablets.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text:
          'On phones and tablets the basemap gallery was still being squeezed to half width by an old rule left over from the previous two-column design, which left too little space beside each preview and cut off the basemap names. The gallery now uses its full width on every screen size, so every name is readable in one line.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.1',
    date: 'July 18, 2026',
    codename: 'One basemap column everywhere',
    summary: 'The basemap gallery now opens as a single column of compact rows on every screen size, matching the rest of the Aireon suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'The basemap gallery previously narrowed to one column only on phones, while desktop kept a two-column grid of large thumbnails. It is now a single column of compact rows everywhere, each with a small preview on the left and the basemap name beside it. The list is quicker to scan, the names are no longer clipped, and the panel covers far less of the map while you pick.',
        prs: [],
      },
    ],
  },
  {
    version: '0.18.0',
    date: 'July 17, 2026',
    codename: 'Made for your phone',
    summary:
      'room now follows the Aireon compact mobile standard: a cleaner top bar, a one-column basemap gallery, stacked map tools, and a parcel panel that can use the whole screen.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Smartphone,
        text:
          'On phones and small screens the top bar now keeps only the essentials: the room wordmark, the address search, and one account menu. Everything that used to sit in the bar, including Open with, search history, save image, my exports, language, appearance, locate me, share, the theme toggle, what is new, the tour, and about, now lives in that single menu, with larger touch targets and a scrollable dropdown that always fits the screen.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Maximize2,
        text:
          'The parcel panel on phones now expands to the full height of the screen, from just under the top bar to the bottom edge, so charts and parcel facts get all the room they need. The grab handle still lets you drop it back to a half-screen peek to see the map.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'The map tools sheet no longer hides controls behind tabs: the parcel opacity, residential type filter, and building opacity cards now stack full width and are all visible at once.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'The basemap gallery opens as a slim single column on phones, capped to about half the screen with its own scrollbar, so it stays clear of the legend and map controls.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.12',
    date: 'July 17, 2026',
    codename: 'Selects that stick',
    summary: 'Address searches and shared parcel links now select the parcel reliably, even on slow connections.',
    items: [
      {
        kind: 'fixed',
        icon: LocateFixed,
        text: 'Picking an address, opening a shared parcel link, or using "Load parcel data" could silently fail to select the parcel when the map tiles finished loading a moment too late. The selection now retries as tiles arrive, so the zone panel opens dependably instead of appearing to do nothing.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.11',
    date: 'July 17, 2026',
    codename: 'Searches that follow you',
    summary:
      'Addresses you search are now remembered across every Aireon app, even when you are not signed in.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Info,
        text:
          'Your recent address searches now follow you from one Aireon app to the next while signed out. Previously each app kept its own private list, so an address looked up in one app never appeared in another. Signed in, your history already syncs to your account and across devices.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.10',
    date: 'July 15, 2026',
    codename: 'About, refined',
    summary: 'A polished, readable About dialog now leads back to every Aireon application.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Info,
        text: 'About room now uses the redesigned suite dialog with explicit high-contrast colors, stronger hierarchy, keyboard focus handling, safe mobile scrolling, localized data labels, and a prominent link to the Aireon Hub application catalog.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.9',
    date: 'July 15, 2026',
    codename: 'Smoother on the move',
    summary: 'Moving the mouse across the map is lighter on your device, especially with a parcel open.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Timer,
        text: 'The live coordinate readout now updates in step with your screen’s refresh rate instead of on every raw mouse movement. With a parcel selected, that means the map no longer re-renders the zone charts and assistant panel dozens of extra times a second while you glide the pointer around — smoother exploration with no change to how the coordinates look.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.8',
    date: 'July 14, 2026',
    codename: 'Signed out, not blacked out',
    summary: 'The account button no longer shows as a dark circle when you are signed out in light mode.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Palette,
        text: 'When you opened the app signed out, the account button in the navbar rendered as a high-contrast dark circle that clashed with the light theme. It now uses the same neutral scheme as every other map control: light grey in light mode, slate in dark mode.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.7',
    date: 'July 12, 2026',
    codename: 'Cached where it counts',
    summary: 'The MapLibre map engine and the React runtime now download once and stay cached across updates, so repeat visits fetch far less.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'room now keeps the MapLibre map engine and the React runtime in their own stable bundles instead of packing them into one large file that changed on every release. Your first-load size is unchanged, but because these big, rarely-changing pieces no longer get a fresh fingerprint on each deploy, your browser reuses the copies it already has. Return visits, and the very next load right after each update, fetch far less data.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.6',
    date: 'July 12, 2026',
    codename: 'Zoning actions at your fingertips',
    summary: 'Right-click any map point to inspect its parcel, save it, share it, or continue in another Aireon app.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: MapPin,
        text: 'A new suite-standard map-actions menu turns the clicked point into a command surface: load the parcel through room’s existing facts and zone-analysis flow, save it to PRM, open the location in another Aireon map, center it, or copy a deep link or coordinates.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.5',
    date: 'July 11, 2026',
    codename: 'Lighter on arrival',
    summary: 'The initial download is ~22% smaller: charts, guided tour and screenshot encoder now load only when used.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'room now arrives ~160 KB (22%) lighter — a real win on mobile connections. The zone-distribution chart stack, the guided-tour engine and the screenshot encoder are split out of the initial bundle and load only when first needed. The chart code quietly pre-warms a moment after the map settles, so the first parcel tap still opens instantly.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Maximize2,
        text: "The mobile bottom sheet's grab handle answers to a comfortably larger tap area (nothing moved visually), so expanding or collapsing the parcel panel with a thumb is less fiddly.",
        prs: [],
      },
    ],
  },
  {
    version: '0.17.4',
    date: 'July 11, 2026',
    codename: 'Ten times the type-checking',
    summary: 'Type-checking now runs on the TypeScript 7 native compiler (~10x faster).',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Type-checking now runs on the TypeScript 7 native compiler (~10x faster). The classic TypeScript 5 toolchain stays in place for linting, so nothing changes in the app itself — checks just finish sooner.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.3',
    date: 'July 10, 2026',
    codename: 'The tour keeps its promise',
    summary: 'Replaying the guided tour with a parcel selected now walks through the parcel-facts and zone-distribution steps it used to skip.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BookOpen,
        text: 'The guided tour silently skipped its "Read the parcel\'s facts" and "Where this parcel ranks" steps even when a parcel was selected, because both steps were pinned to a single panel element the tour could never find. They now spotlight the parcel info panel and its tab switcher, so replaying the tour from the account menu covers the full walkthrough as intended.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.2',
    date: 'July 9, 2026',
    codename: 'A sharper account menu',
    summary: 'The saved-parcels pipeline in your account menu is now interactive, with a needs-attention nudge and full keyboard navigation.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bookmark,
        text: 'Your account menu got sharper: click any pipeline stage (New, Contacted, Negotiation, Due Diligence) to jump straight to that filtered list of saved parcels, watch for a needs-attention nudge that surfaces high-priority and stale parcels, and drive the whole menu by keyboard. The account card now shows your real role too (via @aireon/shared v1.87.0).',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.1',
    date: 'July 8, 2026',
    codename: 'Spring cleaning',
    summary: 'Removed a dead, unused Mapbox access-token constant left over from the MapLibre migration.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Code2,
        text: 'Removed a dead, unused Mapbox access-token constant left over from the MapLibre migration.',
        prs: [],
      },
    ],
  },
  {
    version: '0.17.0',
    date: 'July 8, 2026',
    codename: 'Buildable in 3D',
    summary:
      'Click a parcel to open a 3D buildable-massing simulator with floors and coverage sliders.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Box,
        text: 'Click a parcel to open a 3D buildable-massing simulator. An auto-orbiting massing model shows the buildable volume, with floors and coverage sliders plus quick presets so you can explore how densely the site could be built (via @aireon/shared v1.84.0).',
        prs: [],
      },
    ],
  },
  {
    version: '0.16.1',
    date: 'July 7, 2026',
    codename: 'A roomier Claire',
    summary:
      'Claire gets a desktop enlarge button for a full-size chat window, and cites market figures without naming outside data providers.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Maximize2,
        text: 'On desktop, Claire\'s window now has an enlarge button in the header. It expands the compact corner dock into a wide, full-height panel so reading answers and typing longer questions feel like a real chat window; tap it again to shrink back (via @aireon/shared v1.82.0).',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text: 'Claire now cites market figures generically and no longer names third-party data providers in her answers or chart titles.',
        prs: [],
      },
    ],
  },
  {
    version: '0.16.0',
    date: 'July 7, 2026',
    codename: 'Claire gets real market data',
    summary:
      'Claire now answers with real market data for the parcel\'s municipality, and her inline charts are interactive: hover tooltips, keyboard access, and a table view.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: TrendingUp,
        text: 'Claire now grounds her answers in real market data for the parcel\'s municipality: live price levels plus 1, 5, 10, and 20-year trends and monthly series, instead of model estimates.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: BarChart3,
        text: 'Claire\'s inline charts were redesigned: hover for exact values with a crosshair, navigate points with the keyboard, flip any chart to a table view, and read accurate axes with refined dark-mode styling (via @aireon/shared v1.81.0).',
        prs: [],
      },
    ],
  },
  {
    version: '0.15.1',
    date: 'July 7, 2026',
    codename: 'Quieter idle animations',
    summary:
      'Idle animations now settle down when nothing is happening, saving CPU and battery.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'The Claire launcher now rests while the assistant is closed, and the online dot in the account menu pings briefly instead of pulsing forever, lowering idle CPU and battery use (via @aireon/shared v1.80.0).',
        prs: [],
      },
    ],
  },
  {
    version: '0.15.0',
    date: 'July 6, 2026',
    codename: 'Claire shows her work',
    summary:
      'Claire can now answer with rich inline cards: charts, key figures, comparison tables, scores, and mini-maps right in the chat.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: MessageSquare,
        text: 'Claire now presents answers as rich inline cards when it helps: key figures, charts, comparison tables, property summaries, scores, and mini-maps appear directly in the conversation instead of plain text.',
        prs: [],
      },
    ],
  },
  {
    version: '0.14.1',
    date: 'July 6, 2026',
    codename: 'Claire, aligned',
    summary:
      'The Claire assistant launcher now sits neatly above the map controls, clear of the parcel panel.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: MessageSquare,
        text: 'When the parcel panel is open, the Claire launcher now lines up above the zoom controls instead of tucking behind the panel edge, so the map corner reads as one tidy cluster.',
        prs: [],
      },
    ],
  },
  {
    version: '0.14.0',
    date: 'July 6, 2026',
    codename: '3D in the map controls',
    summary:
      'The 3D buildings toggle moved into the map control stack as a cube button, and the zoom control now uses the Aireon red accent like the rest of the suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Box,
        text: 'The 3D buildings toggle is now a red cube button at the top of the zoom control, next to zoom and reset-bearing, instead of a separate card in the layers panel. The map controls are tidier and consistent with the other Aireon apps.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Palette,
        text: 'The zoom control now uses the Aireon red accent for hover and focus, matching the rest of the suite.',
        prs: [],
      },
    ],
  },
  {
    version: '0.13.2',
    date: 'July 6, 2026',
    codename: 'Wider error net',
    summary:
      'Behind-the-scenes reliability upgrade: room now captures a broader set of errors automatically so we can spot and fix problems faster.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Broader automatic error capture (failed requests, resource + CSP errors) via @aireon/shared v1.75.0.',
        prs: [],
      },
    ],
  },
  {
    version: '0.13.1',
    date: 'July 5, 2026',
    codename: 'Theme in sync',
    summary:
      'Fixed the navbar and user menu showing the wrong theme colors on startup until the theme was toggled.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Palette,
        text:
          'When your saved profile theme differed from the theme the app started with, the navbar wordmark and user menu could render in the wrong colors until you toggled the theme twice. The app now follows theme changes applied by your profile immediately.',
        prs: [],
      },
    ],
  },
  {
    version: '0.13.0',
    date: 'July 5, 2026',
    codename: 'Prune your recent searches',
    summary:
      'Recent search history rows now have a delete button so you can remove individual entries.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Search,
        text:
          'Each row in the Recent searches dropdown now has a delete (×) button. Hover a past search and click the × to remove just that one entry, without clearing your whole history.',
        prs: [],
      },
    ],
  },
  {
    version: '0.12.0',
    date: 'July 4, 2026',
    codename: 'Search by EGRID',
    summary:
      'The address search now understands Swiss federal parcel numbers (EGRIDs), and the parcel panel shows a copyable EGRID.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Search,
        text:
          'You can now search by EGRID. Type a Swiss federal parcel number such as "CH8075" into the search box and matching parcels appear at the top of the results, alongside the usual address matches. Selecting one flies straight to that parcel.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: MapPin,
        text:
          'The parcel panel now leads with a suite-standard identity header: the address as the title, the municipality below it, and the EGRID as a chip you can copy to the clipboard with one click.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.9',
    date: 'July 4, 2026',
    codename: 'Tighter layer controls',
    summary:
      'Tightened the spacing in the map layer controls for a more compact panel.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'Tightened the spacing between the parcel, building, and 3D view controls so the layers panel reads as one compact group.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.8',
    date: 'July 3, 2026',
    codename: 'One opacity for every parcel',
    summary:
      'Parcels now render at a uniform opacity for a consistent look across the suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'Parcels now render at a uniform opacity across the map. When you select a zone, parcels outside it are no longer dimmed, so every parcel shows at the same opacity. This keeps room consistent with the rest of the suite, and the selected zone is still highlighted by its color.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.7',
    date: 'July 2, 2026',
    codename: 'Filter for what is built',
    summary:
      'Added a No filter option, and All now shows only parcels with buildings.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Filter,
        text:
          'Refined the Residential type filter. The new No filter option shows every parcel on the map, including agricultural and vacant land. All now shows only parcels that have at least one building, while Houses and Apartments continue to show single-dwelling and multi-dwelling parcels. Your choice is still remembered the next time you open room.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.6',
    date: 'July 1, 2026',
    codename: 'Residential type filter',
    summary:
      'Filter the map to houses or apartments, and the choice is remembered.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Filter,
        text:
          'Added a Residential type filter to the map controls. Switch between All, Houses, and Apartments to narrow the parcels on the map: Houses shows single-dwelling parcels, Apartments shows multi-dwelling parcels, and All shows every parcel as before. Your choice is remembered the next time you open room.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.5',
    date: 'July 1, 2026',
    codename: 'Quiet the wallet',
    summary:
      'Stopped browser wallet extensions (MetaMask) from generating false error reports.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Browser wallet extensions such as MetaMask no longer trigger false error reports in room. These pop-ups came from the extension itself, not the app, so they are now filtered out of our error monitoring.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.4',
    date: 'July 1, 2026',
    codename: 'One face everywhere',
    summary:
      'Your profile avatar now stays in sync across every Aireon app.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BadgeCheck,
        text:
          'Your profile avatar now stays in sync across every Aireon app.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.3',
    date: 'July 1, 2026',
    codename: 'Spell it our way',
    summary:
      'US English spelling across the UI.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text:
          'Switched the interface copy to US English spelling (for example "utilization" instead of "utilisation"), so the wording is consistent throughout the app. No functional change.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.2',
    date: 'June 30, 2026',
    codename: 'Median on the mark',
    summary:
      'The per-room median price now floats directly above its marker on each range bar, so the figure lines up with where it falls in the range.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: TrendingUp,
        text:
          'Each per-room median value now sits directly above its marker on the bar, instead of on a separate centered line, so you can see at a glance where the median falls between the minimum and maximum.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.1',
    date: 'June 30, 2026',
    codename: 'Clear ranges',
    summary:
      'The per-room market bars now spell out the low, median and high of each range, so you can read the spread at a glance instead of one ambiguous number.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: TrendingUp,
        text:
          'Redesigned the per-room range bars in the Market section so each room now labels its min, median and max. The minimum and maximum sit at the ends of the bar, the median is printed above it and marked on the bar with a high-contrast tick, and a one-time min / median / max legend heads the column. Previously only the median was shown at the far right, where it read like the maximum.',
        prs: [],
      },
    ],
  },
  {
    version: '0.11.0',
    date: 'June 30, 2026',
    codename: 'Market intel',
    summary:
      'The parcel panel now shows local market figures: city-level rent and buy prices for apartments and houses, right where you read a parcel.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: TrendingUp,
        text:
          'Added a new "Market" section to the Parcel facts panel. It surfaces city-level market data for the parcel\'s municipality - toggle between Rent and Buy, and Apartments and Houses, to see the median price, the 80% asking range (10th-90th percentile), the price per m², and per-room range bars (±20% around each room-count average) on one shared scale. A muted line shows how many listings are for rent or for sale. The section hides itself when no market data is available for the city.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.24',
    date: 'June 30, 2026',
    codename: 'Default zoom 17',
    summary:
      'The map now opens one step wider by default, starting at zoom level 17.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ZoomIn,
        text: 'Opening the map without a ?zoom= value now starts at zoom level 17, via the shared @aireon/shared v1.69.0 default. Links with an explicit ?zoom= value keep that zoom.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.23',
    date: 'June 30, 2026',
    codename: 'Claire clears 3D controls',
    summary:
      "Claire's floating launcher now stays clear of the 3D zoom button when a parcel panel is open.",
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Layers,
        text:
          "Updated @aireon/shared to v1.68.3 so Claire sits higher beside open parcel panels and no longer overlaps the 3D button in the zoom control.",
        prs: [],
      },
    ],
  },
  {
    version: '0.10.23',
    date: 'June 28, 2026',
    codename: 'Shared launch zoom',
    summary:
      'The map now uses the shared Aireon default zoom when no zoom is provided in the link.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ZoomIn,
        text: 'Opening the map without a ?zoom= value now starts from the shared @aireon/shared map default: zoom 18. Links with an explicit ?zoom= value still keep that zoom.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.22',
    date: 'June 24, 2026',
    codename: 'Quieter map console',
    summary:
      'Cleared a harmless but noisy basemap console warning. No visible change to the map.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text:
          'The map no longer logs a repeated "type number, but found null" warning from the swisstopo basemap contour lines. Shipped via the shared @aireon/shared v1.67.0 update; the map looks and behaves the same.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Deployment checks now load the private shared Aireon package through a read-only deploy key, so preview and production builds no longer depend on a developer machine\'s Git credentials.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.21',
    date: 'June 23, 2026',
    codename: 'Steadier parcel hover',
    summary:
      'The parcel highlight no longer chases the cursor across the map while you are zoomed out.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Zap,
        text:
          'Moving the mouse quickly while zoomed out no longer makes the parcel highlight race through every parcel on the way to where you stop. The hover highlight now appears only once you zoom in close (zoom 17 and above), so a zoomed-out map stays a clean overview. Zoom in to z17 and hover works as before.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Info,
        text:
          'The About dialog now uses the suite-standard shared modal from @aireon/shared v1.66.0 while keeping room\'s own swisstopo and MapLibre credits.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.19',
    date: 'June 22, 2026',
    codename: 'Skeleton on open',
    summary:
      'The app now opens with a skeleton placeholder of its layout instead of a loading spinner.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'When room opens, it now shows a skeleton of its layout while it loads — instead of a spinner — so the page is visible right away and the wait feels shorter. The skeleton follows your theme.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.18',
    date: 'June 22, 2026',
    codename: 'Shared v1.64.0',
    summary:
      'Refreshed the shared interface library so the bits room borrows from it read with plain hyphens, not em-dashes.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text:
          'Updated @aireon/shared to v1.64.0, which removes em-dashes from shared UI strings (Claire labels, What\'s New button, saved-parcels / bug-report dialogs).',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.17',
    date: 'June 22, 2026',
    codename: 'Claire chat, secured',
    summary:
      'Claire\'s chat now runs through a secure server-side proxy, so the AI key is no longer shipped in the app.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Claire\'s chat now routes through a secure server-side proxy - the same one her voice calls already use - so the Gemini AI key is no longer shipped in the app. No change to how Claire works for you.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.16',
    date: 'June 22, 2026',
    codename: 'Hyphens, not em-dashes',
    summary:
      'Tidied up the punctuation across the interface - every em-dash is now a plain hyphen for a cleaner, more consistent read.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text:
          'Swapped every em-dash in the interface copy - titles, tooltips, the guided tour and release notes - for a plain hyphen, so the text reads consistently everywhere.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.15',
    date: 'June 22, 2026',
    codename: 'Open With Parcel',
    summary:
      'The "Open with" menu now activates when you click a parcel on the map - not just after an address search.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'The "Open with" cross-app menu now appears whenever a parcel is selected by clicking the map, falling back to the last searched address. Previously it only activated after an address search.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.14',
    date: 'June 21, 2026',
    codename: 'Access, Enforced',
    summary:
      'room now respects the access level and launch status set for it in the hub’s App Manager.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text:
          'room now respects the access level and launch status set for it in the hub’s App Manager: member-only asks you to sign in, admin-only or under construction shows a short notice. Public apps - the default - are unaffected.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.13',
    date: 'June 21, 2026',
    codename: 'Locate, Relocated',
    summary:
      'Locate me has moved from the top bar into the account menu, tidying the navbar in line with the other Aireon map apps.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LocateFixed,
        text:
          'Moved Locate me (find my location) out of the navbar toolbar and into the account menu, at the top of "More tools" - decluttering the top bar to match the other Aireon map apps.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.12',
    date: 'June 21, 2026',
    codename: 'Controls In Place',
    summary:
      'The zoom control now sits in the bottom-right corner and Claire no longer overlaps the parcel info panel - matching the other Aireon map apps.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'Moved the zoom/compass control from the bottom-left to the bottom-right corner, in line with the other Aireon map apps. The density legend now takes its place at the bottom-left.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Bot,
        text:
          'On desktop the Claire launcher no longer tucks under the left edge of the parcel info panel - it now sits clear of the panel, stacked just above the zoom control.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.11',
    date: 'June 21, 2026',
    codename: 'About At Hand',
    summary:
      'The top bar now has an About (info) icon next to Search history.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Info,
        text:
          'The top bar now has an About (info) icon next to Search history, opening the app details directly instead of only from the account menu - matching valoo and the other Aireon apps.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.10',
    date: 'June 21, 2026',
    codename: 'Panel In Frame',
    summary:
      'The parcel info panel is back in saved images - it was being dropped from the export.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Camera,
        text:
          'Save image now includes the parcel info panel - it was dropped from the export because its slide-in animation left it off-frame at capture time.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.9',
    date: 'June 21, 2026',
    codename: 'Tighter Labels',
    summary:
      'Two map button labels are now shorter and snappier across all four languages.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text:
          'Shortened two button labels: “Track parcel” → “Track” and the locate-me control → “Locate” (all four languages).',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.8',
    date: 'June 20, 2026',
    codename: 'Clean Export',
    summary:
      'Saved images now capture only the map and its legend - the interactive chrome is dropped, fonts embed without errors, and the parcel-panel shadow no longer bleeds in.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Camera,
        text:
          'Exported images (Save image / My exports) now drop the interactive chrome - navbar + address search, the Claire launcher, the zoom control, and other map controls - so only the map result and its legend are captured. (via @aireon/shared v1.57.0)',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Bug,
        text:
          'Saving an image no longer logs a cssRules SecurityError - the Google Fonts stylesheet is now loaded with crossorigin so fonts embed cleanly.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Bug,
        text:
          'Removed the faint vertical strip beside the parcel panel in saved images (its drop-shadow is dropped during capture; the live UI is unchanged).',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.7',
    date: 'June 21, 2026',
    codename: 'Dock',
    summary:
      'Aireon mobile-UX standard: MapControlDock FAB, MapLegendChip, SegmentedTabs panel header, About modal with map credits.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'Map controls now use the suite-standard MapControlDock: a FAB on mobile opens a bottom sheet with tabbed Parcel / Building / 3D cards; on desktop the floating stack shifts clear of the open panel.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The density legend collapses to a MapLegendChip on mobile so it never overlaps the panel; on desktop it stays pinned bottom-left.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: PanelsTopLeft,
        text:
          'Panel tab header (Zone distribution / Parcel facts) now uses the shared SegmentedTabs component for a consistent cross-suite look.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Info,
        text:
          'New "About this app" entry in the account menu opens a modal listing the swisstopo map data and MapLibre GL renderer credits; built-in attribution control removed.',
        prs: [],
      },
    ],
  },
  {
    version: '0.10.6',
    date: 'June 20, 2026',
    codename: 'Focus',
    summary:
      'On desktop the floating Claire launcher is now the single entry point - the duplicate in-panel "Ask Claire" button shows on phones only.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          "On desktop the floating Claire launcher is the one entry point, so the duplicate 'Ask Claire' button in the panel now appears on phones only - where the launcher is hidden. Either way opens the same Claire chat. (via @aireon/shared v1.55.0)",
        prs: [],
      },
    ],
  },

  {
    version: '0.10.5',
    date: 'June 20, 2026',
    codename: 'Theme Follows You',
    summary:
      'Your light/dark choice now carries across every Aireon app - and across your devices when signed in.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Palette,
        text:
          'Your light/dark choice now carries across every Aireon app - and across your devices when signed in.',
        prs: [],
      },
    ],
  },

  {
    version: '0.10.4',
    date: 'June 20, 2026',
    codename: 'Settle',
    summary:
      'Loading states are calmer - content now settles in with skeleton placeholders instead of spinning icons.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'Loading spinners are now skeleton-style placeholders, matching the rest of the suite.',
        prs: [],
      },
    ],
  },

  {
    version: '0.10.3',
    date: 'June 20, 2026',
    codename: 'Tidy Top Bar',
    summary:
      'The top bar is tidier. Share this view and the dark/light toggle moved into the account menu, and search history is now a one-tap button right in the bar.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'Tidied the top bar - Share this view and the dark/light toggle moved into the account menu; search history is now a one-tap button in the bar.',
        prs: [],
      },
    ],
  },

  {
    version: '0.10.2',
    date: 'June 20, 2026',
    codename: 'Shared Translations',
    summary:
      'The language system now runs on the suite-shared i18n engine - same translations, but faster (fewer re-renders) and consistent with the rest of the apps.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text:
          'Switched the translation provider to the shared @aireon/shared createI18n factory (v1.50.0) - memoized, so the UI re-renders less.',
        prs: [],
      },
    ],
  },

  {
    version: '0.10.1',
    date: 'June 20, 2026',
    codename: 'Admin Pill',
    summary:
      'Suite admins now see a small “admin” pill on their account avatar, so it’s clear at a glance when you’re signed in with elevated access.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text:
          'Suite admins now see a small “admin” pill on their account avatar (via @aireon/shared v1.49.0).',
        prs: [],
      },
    ],
  },

  {
    version: '0.10.0',
    date: 'June 19, 2026',
    codename: 'Ask Claire',
    summary:
      'A prominent "Ask Claire" button now sits in the parcel panel, right above Track parcel, so you can open the AI assistant for the selected parcel in one tap. The floating launcher is still there too.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Added a full-width "Ask Claire" call-to-action to the selected-parcel panel, next to the Track action, opening room’s existing Claire assistant pre-focused on that parcel. The floating Claire launcher is kept, so you now have both entry points.',
        prs: [],
      },
    ],
  },

  {
    version: '0.9.4',
    date: 'June 19, 2026',
    codename: 'One Close Button',
    summary:
      'Every dismiss (×) control - the parcel panel, the My exports gallery and preview, and toast notifications - now uses the shared suite-standard close button, so they look and behave the same everywhere and stay legible in light and dark themes.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Adopted the shared CloseButton from @aireon/shared v1.46.0 across the app: the parcel info panel, the My exports panel header and image preview, and toast notifications now share one consistent, accessible close control.',
        prs: [],
      },
    ],
  },

  {
    version: '0.9.3',
    date: 'June 18, 2026',
    codename: 'Lazy Changelog',
    summary:
      'Trimmed the initial download: the What’s-New release history now loads on demand instead of shipping in the first bundle.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Zap,
        text:
          'perf: lazy-load the changelog out of the entry bundle. The release-notes data and the What’s-New panel are now code-split into their own chunk, loaded only when you open What’s New, so the rest of the app starts a little faster.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Image,
        text:
          'My exports now uses proper dialog focus handling for the gallery, preview and delete confirmation, replaces native browser confirm/alert prompts with in-app UI, and uses dynamic viewport sizing on mobile.',
        prs: [],
      },
    ],
  },

  {
    version: '0.9.2',
    date: 'June 18, 2026',
    codename: 'Share the View',
    summary:
      'A new "Share this view" button in the navbar lets you copy a link to the current map view with one click.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: Camera,
        text:
          'Added a "Share this view" button to the navbar - it copies a link to the current map view and confirms with a "Link copied to clipboard" pill.',
        prs: [],
      },
    ],
  },

  {
    version: '0.9.1',
    date: 'June 18, 2026',
    codename: 'Lighter Footprint',
    summary:
      'Dropped an unused address-search dependency from the build; room uses the suite-standard tokenless Swiss federal address search.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Package,
        text:
          'Removed the unused @mapbox/mapbox-gl-geocoder dependency. room searches addresses with the suite-standard tokenless geo.admin service, so this package was never imported - dropping it trims the dependency tree with no behavior change.',
        prs: [],
      },
    ],
  },

  {
    version: '0.9.0',
    date: 'June 18, 2026',
    codename: 'Liquid Glass',
    summary:
      'A new Liquid Glass appearance setting lets the map chrome and panels turn translucent - pick Off, Frosted or Liquid from the navbar settings.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Updated @aireon/shared to v1.36.3 so /api/signal-collect now runs as a Node serverless proxy instead of the stalled Edge handler. Signals respond again with the server-side RES token fallback.',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: Sparkles,
        text:
          'A new “Appearance” control in the navbar settings (the gear menu) adds the suite-wide Liquid Glass look. Choose Off (room’s original solid panels), Frosted or Liquid, and the floating map chrome - zoom control, layer controls and the density legend - plus the parcel side panel, the account menu and the saved-images window turn into translucent frosted glass. Off is the default and leaves every surface exactly as before; your choice is remembered for next time.',
        prs: [],
      },
    ],
  },

  {
    version: '0.8.1',
    date: 'June 17, 2026',
    codename: 'Find Your Way',
    summary:
      'The address search now uses the suite-standard wording.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text:
          'The address search box now reads the suite-standard “Search address…” placeholder (and its German, French and Italian equivalents), so room matches the wording used across the other Aireon map apps.',
        prs: [],
      },
    ],
  },

  {
    version: '0.8.0',
    date: 'June 16, 2026',
    codename: 'Light Switch',
    summary:
      'room now has a light theme. A Sun/Moon toggle in the toolbar flips the whole app - map, charts, zone panels and chrome - between light and dark, and the swisstopo basemap follows along.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text:
          'The Open with menu now drops retired apps from the suite target list, so cross-app launches only show active Aireon apps.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'Top-level map controls now inherit the shared Aireon navbar spacing tokens, keeping the basemap selector and layer controls aligned with the same offset used by roofs and roots.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: BookOpen,
        text:
          'A short “Frequently asked questions” section now sits at the bottom of the Parcel facts panel - what room calculates, where its zoning data comes from, and a reminder that the utilization figure is indicative, not binding. The same Q&A is published as FAQ structured data so search and AI answer engines can surface it.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Code2,
        text:
          'SEO: added a canonical URL and JSON-LD structured data (WebApplication/SoftwareApplication) to the page head so search engines and AI answer engines can index room from a raw page fetch.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Palette,
        text:
          'A theme toggle (Sun ⇄ Moon) now sits in the navbar toolbar. Switch between room’s signature dark look and a new bright light theme; every surface - the layer controls, the density legend, the zone-distribution charts (gauge, boxplot, histograms, time line and scatter), the parcel-facts panel, saved images and coordinates - repaints to match. The basemap pairs itself to the theme (a light map in light mode, a dark map in dark mode) until you pick one yourself, and your choice is remembered for next time. room still opens in dark mode by default.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.6',
    date: 'June 16, 2026',
    codename: 'Mission Control',
    summary:
      'A redesigned, on-brand sign-in screen with the Aireon look.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'The sign-in screen has a fresh Aireon look - the Aireon wordmark on a dark “mission-control” card with a subtle map-grid texture and a soft red glow, replacing the old white SWISSNOVO card. It now matches the rest of the Aireon suite.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.5',
    date: 'June 16, 2026',
    codename: 'Untrack Toggle',
    summary:
      'The “Track parcel” bar now toggles - click it again to untrack the parcel.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Bookmark,
        text:
          'You can now untrack a parcel with the same control you used to track it. The green “Tracked” bar is now a button - click it to remove the parcel from your proom list.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.4',
    date: 'June 16, 2026',
    codename: 'History Up Top',
    summary:
      'My search history now sits in the account menu’s “More tools” group, right after Take the tour.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'My search history now lives in the account menu’s “More tools” section, right after “Take the tour” - it used to sit lower down, near “Sign out”.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.3',
    date: 'June 16, 2026',
    codename: 'Tidy Tools',
    summary:
      'Report a problem now lives in the account menu, right under Take the tour.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Bug,
        text:
          'The bug-report control moved out of the floating shield button and into the account menu’s “More tools” group, appearing as a “Report a problem” row just below “Take the tour”. Same dialog, tidier map.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.2',
    date: 'June 14, 2026',
    codename: 'Dark Rails',
    summary:
      'Dark mode now uses a slim, refined scrollbar shared across the Aireon suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'In dark theme the scrollbars are now a slim, rounded slate “pill” that lightens on hover, instead of the heavy default bar. The design lives in @aireon/shared, so dark-mode scrollbars look identical across every Aireon app.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.1',
    date: 'June 14, 2026',
    codename: 'Two By Two',
    summary:
      'The saved-parcels pipeline counts in the account menu now sit in a balanced 2×2 grid.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Layers,
        text:
          'In the “My saved parcels” summary, the four pipeline stages (New, Contacted, Negotiating, Due Diligence) now lay out as a tidy 2×2 grid instead of an uneven 3 + 1.',
        prs: [],
      },
    ],
  },

  {
    version: '0.7.0',
    date: 'June 13, 2026',
    codename: 'Navbar Buttons',
    summary:
      'Save image and My exports are now direct buttons in the navbar, matching the suite-standard layout.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Camera,
        text:
          'Save image and My exports moved from the account menu into the navbar as direct buttons, matching the suite-standard layout (valoo).',
        prs: [],
      },
    ],
  },

  {
    version: '0.6.0',
    date: 'June 13, 2026',
    codename: 'Nearby Comparables',
    summary:
      'The parcel info panel now surfaces up to five nearby parcels that are for sale, ranked by distance, plot size and zone similarity - each a tappable card that flies the map there.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Sparkles,
        text:
          'New “Nearby comparables (for sale)” section at the bottom of the parcel facts. It reads for-sale parcels straight off the map tiles, ranks the five closest matches and shows each one’s CHF/m² and the difference versus the selected parcel. Click a card to fly the map to that parcel.',
        prs: [],
      },
    ],
  },

  {
    version: '0.5.41',
    date: 'June 13, 2026',
    codename: 'Tidy-up',
    summary:
      'A small polish pass: the guided tour now calls the product family by its current name, and the mobile parcel sheet sizes itself to the visible viewport.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text:
          'The “Track this parcel” tour step now refers to the Aireon suite (was “SwissNovo suite”) in all four languages, matching the rest of the app.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'The mobile parcel sheet now uses dynamic viewport (dvh) units, so its grab handle and tabs no longer slip under the browser’s address bar when expanded.',
        prs: [],
      },
    ],
  },

  {
    version: '0.5.40',
    date: 'June 13, 2026',
    codename: 'Shared App Navbar',
    summary:
      'The entire top bar is now the suite-shared Aireon navbar, so the hub badge, address search, map toolbar and account menu stay byte-for-byte in lockstep with the rest of the suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: PanelsTopLeft,
        text:
          'Replaced room’s hand-rolled header and inline address search with the shared <AppNavbar> from @aireon/shared v1.18.1. Same look and behavior - Mapbox address search, “Open with”, the Locate · Settings · Language toolbar and the account menu - with far less app-specific code.',
        prs: [],
      },
    ],
  },

  {
    version: '0.5.39',
    date: 'June 13, 2026',
    codename: 'Claire, Front and Center',
    summary:
      'Claire’s chat header and message avatars get a tidier, more consistent layout.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text:
          'Updated @aireon/shared to v1.16.1: Claire’s “claire” wordmark is now left-aligned in the chat header, and her blinking-face avatar appears in front of every message, including the opening greeting.',
        prs: [],
      },
    ],
  },

  {
    version: '0.5.38',
    date: 'June 12, 2026',
    codename: 'Report Categories',
    summary:
      'The bug report form now lets users classify bugs and feedback before sending.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Updated @aireon/shared to v1.16.0 so the Bug/Feedback dialog now includes optional category checkboxes. Error reports can be marked as data, UI, map/address, login/access or crash/performance issues; feedback can be marked as feature request, data improvement, usability, design/content or general feedback. Selected categories are sent with the report metadata.',
        prs: [],
      },
    ],
  },

  {
    version: '0.5.37',
    date: 'June 12, 2026',
    codename: 'Refreshed Account Menu',
    summary:
      'The account menu picks up the latest shared Aireon improvements: an inline edit button, an Open-in-proom shortcut and a leaner saved-parcels pipeline.',
    items: [
      {
        kind: 'improved',
        icon: PanelsTopLeft,
        text:
          'Refreshed the account menu via @aireon/shared v1.16.0: the profile button now sits beside the Active status line and is relabeled "edit", saved parcels gain an Open-in-proom shortcut, and the PRM pipeline is trimmed to four active stages.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.36',
    date: 'June 12, 2026',
    codename: 'Shared Map Toolbar',
    summary:
      'The navbar action cluster now uses the shared Aireon map toolbar, so locate, settings and language stay in lockstep with the rest of the suite.',
    items: [
      {
        kind: 'improved',
        icon: PanelsTopLeft,
        text:
          'Replaced the hand-rolled navbar action row and its mobile overflow menu with the shared @aireon/shared MapToolbar (v1.15.0). Locate, a new Settings placeholder and the language picker now share one component - same icons, order and behavior - and fold into a single ⋯ menu on phones.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.35',
    date: 'June 12, 2026',
    codename: 'Theme-Aware Hub Mark',
    summary:
      'The top-left Aireon hub shortcut now renders as a transparent monochrome mark that follows light and dark themes.',
    items: [
      {
        kind: 'improved',
        icon: Sparkles,
        text:
          'Updated the top-left Aireon hub shortcut to use the hub-hosted transparent Aireon mark. It renders black on light themes and white on dark themes, while the browser favicon stays red on white.',
        prs: [],
      },
    ],
  },

  
  {
    version: '0.5.34',
    date: 'June 11, 2026',
    codename: 'Shared Avatar Base',
    summary:
      'The account menu and avatar picker now use the same @aireon/shared v1.14.6 build as the rest of the Aireon suite.',
    items: [
      {
        kind: 'improved',
        icon: Sparkles,
        text:
          'Standardized the navbar hub shortcut on @aireon/shared v1.14.11 so the top-left button uses the canonical Aireon favicon from hub.aireon.ch.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Package,
        text:
          'Updated @aireon/shared to v1.14.10 so the Claire launcher keeps the cute avatar icon, while the claire wordmark appears only at the centered top of the open chat dialog.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: ShieldAlert,
        text:
          'Updated @aireon/shared to v1.14.9 so the bug-report launcher, dialog header and Bug type selector now use the Lucide shield-alert icon across the shared widget.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text:
          'Aligned room with @aireon/shared v1.14.6 so the shared account menu and profile avatar picker resolve from the same central package version across Aireon.',
        prs: [],
      },
    ],
  },
{
    version: '0.5.33',
    date: 'June 11, 2026',
    codename: 'Avatar Rail',
    summary:
      'Avatar selection is faster, and a small bug button now lets you report problems directly from room.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text:
          'Updated @aireon/shared to v1.14.5. The shared profile avatar picker renders as a three-row horizontal rail, applies a selected avatar instantly and shows a compact "Avatar updated" confirmation pill.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Bug,
        text:
          'Added the shared Aireon bug-report button. It opens a compact Bug/Feedback modal and sends reports through the fixed Node serverless errorlog proxy into the central Bug Tracker.',
        prs: [],
      },
    ],
  },


  {
    version: '0.5.32',
    date: 'June 11, 2026',
    codename: 'Swiss Basemaps',
    summary:
      'The basemap switcher now offers the shared swisstopo gallery - six Swiss-made basemaps with live map thumbnails - in place of the Mapbox styles.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Updated @aireon/shared to v1.14.5 so Claire uses the new WebP logo mark in the launcher, panel header, assistant badges and voice transcript instead of the old text/avatar treatment.',
        prs: [],
      },
      {
        kind: 'changed' as ChangeKind,
        icon: Layers,
        text:
          'Replaced the Mapbox basemap list (Dark/Streets/Satellite/…) with the shared swisstopo basemap gallery: Standard, Light, Light Minimal, Dark, Dark Minimal and Aerial, each shown as a live thumbnail of the current map view.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.30',
    date: 'June 10, 2026',
    codename: 'Bird’s Eye',
    summary:
      'The parcel panel now shows a swisstopo aerial thumbnail of the selected parcel that opens full-size on click.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Image,
        text:
          'Added a swisstopo aerial thumbnail to the parcel info panel header - an 88px bird’s-eye preview of the selected parcel that expands to a full-size lightbox.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.29',
    date: 'June 10, 2026',
    codename: 'Crisp Export',
    summary:
      'Saved map images are no longer blank, and the "See all in Showroom" link points to the current Showroom address.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Image,
        text:
          'Map screenshots now capture the actual map instead of a blank area - the WebGL canvas keeps its drawing buffer readable after the MapLibre renderer switch.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text:
          'The "See all publications in Showroom" button now opens showroom.aireon.ch instead of the retired swissnovo address.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.28',
    date: 'June 9, 2026',
    codename: 'Aligned Meta',
    summary:
      'The page metadata now uses the same description shown on the Aireon hub card.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Updated the HTML meta, Open Graph and Twitter descriptions to match the Aireon hub card copy: "Check and visualize zoning categories and reverse utilizations in any municipality.".',
        prs: [],
      },
    ],
  },
{
    version: '0.5.27',
    date: 'June 9, 2026',
    codename: 'Open Renderer',
    summary:
      'room now draws the map with the open-source MapLibre GL engine instead of Mapbox GL. The basemaps, parcels and 3D buildings look and behave exactly as before - an under-the-hood switch that drops a proprietary dependency.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text: 'Claire now picks up @aireon/shared v1.9.1: the header drops the powered-by line, shows a larger Claire title, uses icon-only Studio/voice controls, and starts with the shorter parcel greeting.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'Migrated the map renderer from Mapbox GL JS to the open-source, BSD-licensed MapLibre GL JS. The same Mapbox-hosted basemaps (Dark, Light, Streets, Satellite, …) are still used, so nothing changes visually - hover, click-to-select, the basemap switcher, 3D buildings and screenshots all work exactly as before.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.25',
    date: 'June 9, 2026',
    codename: 'Zoom to Select',
    summary:
      'Parcels are now only selectable once you have zoomed in to block level - the same threshold that already controls the hover highlight. Clicking while zoomed way out no longer picks the wrong tiny parcel.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'Clicking the map now only selects a parcel once you have zoomed in past block level - matching the hover highlight, which already appears only at that zoom. When the map is zoomed out to an overview, parcels are too small to target precisely, so clicks are ignored instead of selecting a near-random parcel. Searching an address or opening a ?lat/?lng link still works at any zoom (they fly in first).',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.24',
    date: 'June 9, 2026',
    codename: 'Open With',
    summary:
      'After you search an address, a new "Open with" button appears in the top bar - jump straight to the same spot in another Aireon app. The locate button also picks up the suite\'s shared navbar styling.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: PanelsTopLeft,
        text:
          'Added an "Open with" menu to the navbar. Once you pick an address, it lets you reopen that exact location in any other Aireon suite app in one tap. The locate button now uses the shared suite navbar icon button, so all top-bar controls look and behave consistently across the suite.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.23',
    date: 'June 9, 2026',
    codename: 'Sharper Tour',
    summary:
      'The guided tour no longer blurs the page behind it. Each step still dims the background and spotlights the highlighted area - but everything now stays crisp and clear instead of fuzzy.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Removed the background blur from the guided tour. Tour steps still dim the page and spotlight the active element, but the rest of the screen now stays sharp instead of being blurred - clearer and more reliable across browsers.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.22',
    date: 'June 9, 2026',
    codename: 'Smooth Zoom-Out',
    summary:
      'The amber hover highlight now only kicks in once you’re zoomed in to block level. Zoomed further out - where the map can show thousands of parcels at once - it stays off, so panning and zooming stay smooth even on modest hardware.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text:
          'Gated the parcel hover highlight to block-level zoom (about z15 and closer). When you zoom out a lot the map can hold thousands of parcels, and re-painting the hover highlight on every mouse-move made low-spec machines stutter. Hover now switches off entirely while you’re zoomed out and returns the moment you zoom into a block - your selected parcel stays highlighted at every zoom.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.21',
    date: 'June 9, 2026',
    codename: 'Back to Hub',
    summary:
      'A small Aireon logo now sits at the left of the top bar, just before the room wordmark. Tap it to jump straight back to the Aireon hub - the same one-tap shortcut across every app in the suite.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Package,
        text:
          'Added the Aireon back-to-hub logo to the navbar, immediately before the room wordmark. One tap routes you to the Aireon hub, matching the consistent navigation now shared across the whole suite. The badge stays muted so it never competes with room’s own branding.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.20',
    date: 'June 8, 2026',
    codename: 'Tidy Toolbar',
    summary:
      'A cleaner top bar. The secondary tools - Export image, My Exports, What’s new and Take a tour - now live tidily under your account menu, so the bar keeps only what you reach for most: search, locate, language and your account.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'Slimmed the top bar to the essentials - logo, address search, locate, language and your account. Export image, My Exports, What’s new (release notes) and Take a tour moved into a new “More tools” section inside the account menu, with a red dot on What’s new when there are updates you haven’t read. The tour and What’s new stay reachable even when you’re signed out.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.19',
    date: 'June 6, 2026',
    codename: 'Browse First',
    summary:
      'No sign-in pop-up on arrival - the zoning map opens straight away. You are only asked to sign in when you use a feature that needs an account, like tracking a parcel or exporting a snapshot.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Dropped the welcome sign-in pop-up that used to appear on a fresh visit. room now opens directly into the map for everyone. The sign-in invitation appears only when you act on a feature that needs an account - tracking a parcel or exporting a screenshot - and it now opens as an in-app modal instead of bouncing you to the sign-in page.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.18',
    date: 'June 5, 2026',
    codename: 'One Sign-In',
    summary:
      'Sign in once, and you are signed in everywhere. room now joins suite-wide single sign-on, so if you are already logged in to another Aireon app in this browser, room signs you in automatically - no second password.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text: "Cross-app single sign-on now works: if you're signed in to any Aireon app in this browser, room signs you in automatically on load - a brief, UI-less check, no second password. Anonymous visitors are unaffected.",
        prs: [],
      },
    ],
  },
  {
    version: '0.5.17',
    date: 'June 4, 2026',
    codename: 'Tour, Fixed',
    summary:
      'The guided tour is more reliable and far more useful. It now walks every step in order from the start - under the new React Compiler an old timing bug could leave it showing only some steps or none. The steps are also richer: clearer guidance to click the map for a parcel’s density and ranking, a new step on tracking a parcel to your proom workspace, and a plainer “N / M” progress counter.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Sparkles,
        text: 'Fixed the guided tour computing its step list during the first render - before the map and panel anchors had mounted - which under the React Compiler could leave it stuck showing 0 or only some steps. Steps are now computed from the live page the moment the tour starts, so every configured step appears in order.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text: 'Rewrote the tour content to be concrete: the map step now spells out that clicking the map picks a parcel and shades its whole zone by built-volume percentile, and points to the facts and distribution panel it opens. Corrected the map step so it spotlights the map (it no longer just centers a blank tooltip).',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: Bookmark,
        text: 'Added a tour step explaining how to track a parcel - saving it to your proom workspace, synced across the SwissNovo suite - plus a clearer step on reading the zone-distribution charts.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text: 'Simplified the tour progress counter to a plain “N / M” (dropping the word “Step”), localised in en/fr/de/it.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.16',
    date: 'June 4, 2026',
    codename: 'Spotlight Focus',
    summary:
      'The guided tour now softly blurs the page behind its overlay again - but the highlighted element stays perfectly sharp. Earlier the blur either covered the focused element too or had to be removed entirely; now only the surroundings go soft-focus, so your eye is drawn to exactly what the step is pointing at.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Restored the guided-tour background blur as a true spotlight: the page behind the overlay is soft-focused while the highlighted element stays sharp and clear. The blur hole tracks the spotlight as it moves between steps.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.15',
    date: 'June 4, 2026',
    codename: 'Track Parcel',
    summary:
      'The parcel-save button now reads “Track parcel” (was “Save to PRM”) so new users immediately get what it does - “PRM” was jargon. Localised across English, French, German and Italian.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text: 'Renamed the parcel-save action from “Save to PRM” to “Track parcel” (and “Saved to PRM” → “Tracked”) for new-user clarity, localized in en/fr/de/it. No change to behavior - it still saves the parcel to your proom workspace.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.14',
    date: 'June 4, 2026',
    codename: 'Compiler On',
    summary:
      'Turned on the React Compiler 1.0 so the app memoizes itself at build time - fewer needless re-renders, with no change to how anything behaves.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Enabled the React Compiler 1.0 (Babel plugin, target React 18) for automatic compile-time memoization - fewer needless re-renders, no behavior change. Healthcheck: 29/29 components compiled.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.13',
    date: 'June 4, 2026',
    codename: 'Composer Lift',
    summary:
      "Claire's chat box now feels like a modern composer: a single line sits centered, and multi-line questions grow the box (like ChatGPT) up to a cap before it scrolls. Ships via the shared component library v0.46.0.",
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text: "Claire's chat entry box vertically centers a single line and auto-grows to fit multi-line input, then snaps back after you send. Refreshed @aireon/shared to v0.46.0.",
        prs: [],
      },
    ],
  },
  {
    version: '0.5.12',
    date: 'June 3, 2026',
    codename: 'Out From Under',
    summary:
      'The +/- zoom control no longer disappears behind the density legend. When you select a parcel, the legend slides to the bottom-right to clear the detail panel - but the previous fix slid the zoom control to that exact same spot, so the legend sat on top of it. The zoom control now lives in the bottom-left corner, well clear of both the legend and the panel.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: PanelsTopLeft,
        text: 'Moved the +/- zoom control to the bottom-left corner so the density legend no longer covers it. Both controls previously landed bottom-right when a parcel was selected; the zoom control now sits on the opposite edge.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.11',
    date: 'June 3, 2026',
    codename: 'Hyphen, Not Dash',
    summary:
      'The browser tab title now uses a plain hyphen separator instead of an em dash, matching the suite convention.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Type,
        text: 'The browser tab title now uses a plain hyphen separator instead of an em dash, matching the suite convention.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.10',
    date: 'June 3, 2026',
    codename: 'Clear View',
    summary:
      'The guided product tour no longer blurs the page behind its overlay. The tour still dims the surroundings to draw the eye, but the focused element and the rest of the page now stay sharp instead of going soft-focus, which kept context readable while you follow along.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Sparkles,
        text: 'The guided product tour no longer blurs the background - the focused element and page stay sharp behind the dimmed tour overlay.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.9',
    date: 'June 3, 2026',
    codename: 'Step Aside',
    summary:
      'Fixes the desktop +/- zoom control getting covered by the right-hand detail panel. The control is meant to slide left when the panel opens, but an inline style was overriding the responsive rule that does the shifting, so on wider screens the control stayed put and the panel sat on top of it. The basemap/layers control was already shifting correctly - the zoom control now matches it.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: PanelsTopLeft,
        text: 'The desktop +/- zoom control now shifts left when the right-hand detail panel opens, instead of staying pinned under it. An inline right offset was beating the responsive md: shift rule; removing it lets the control move aside like the basemap control already did.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.8',
    date: 'June 2, 2026',
    codename: 'Suite Alignment',
    summary:
      'A small consistency pass to bring room back in line with the rest of the SwissNovo suite. The typography design tokens are restored to the suite-standard --hood- prefix (the previous rename to --room- was the drift, not the fix - every app forks hood and shares that namespace). Focus rings on the top-bar controls now use the keyboard-only focus-visible mechanism the rest of the suite uses, and Tailwind\'s class-based dark mode is now declared explicitly (room remains dark-only by design).',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Type,
        text: 'Restored the typography CSS custom properties to the suite-standard --hood-{font,display,mono} prefix (reverting the v0.5.7 rename to --room-). The --hood- namespace is the intentional shared standard across all SwissNovo apps; no functional change.',
        prs: [],
      },
      {
        kind: 'changed' as ChangeKind,
        icon: BadgeCheck,
        text: 'Top-bar controls (sign-in, user menu, screenshot button, zone-filter input, address search) now use focus-visible: focus rings appear only for keyboard navigation, with a ring offset for clarity on the dark bar - matching the suite-wide focus standard already used by the zoom control.',
        prs: [],
      },
      {
        kind: 'changed' as ChangeKind,
        icon: Layers,
        text: 'Declared Tailwind darkMode:\'class\' and assert the `dark` class on <html> at startup. room is intentionally dark-only (no light theme); this just aligns the theming mechanism with the suite standard.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.7',
    date: 'June 2, 2026',
    codename: 'Token Tidy',
    summary:
      'Internal cleanup: the typography design tokens in src/index.css were copied from the hood project and still carried the --hood- prefix. They now use the room-specific --room- namespace to remove naming drift and confusion for maintenance.',
    items: [
      {
        kind: 'changed' as ChangeKind,
        icon: Type,
        text: 'CSS custom properties renamed from --hood-{font,display,mono} to --room-{font,display,mono} so room owns its own token namespace (no functional change).',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.6',
    date: 'May 31, 2026',
    codename: 'Preview',
    summary: 'Centralized the social-share preview image.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Image,
        text: 'Social-share preview image now uses the centralized toolbox URL (https://toolbox.swissnovo.com/meta/room.jpg) with correct dimensions.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.5',
    date: 'May 31, 2026',
    codename: 'Error Capture',
    summary:
      'room now automatically reports client-side errors to the SwissNovo suite-wide error-logging service, so problems surface to the team without anyone having to report them. Picks up @aireon/shared v0.42.0.',
    items: [
      {
        kind: 'added' as ChangeKind,
        icon: Zap,
        text: 'Automatic client-error capture: uncaught errors are now reported to the shared SwissNovo error-logging service via @aireon/shared v0.42.0.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.4',
    date: 'May 30, 2026',
    codename: 'Tidy Headings',
    summary:
      'Claire\'s structured answers now show real headings. When she split a reply into sections, the section titles were appearing with their raw Markdown "###" hashes still attached. The shared chat renderer now turns those into styled bold headings, so multi-section answers read cleanly.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: MessageSquare,
        text: 'Claire\'s section headings no longer show literal "###" hashes - the shared chat renderer formats Markdown headings (#–######) as styled bold heading text.',
        prs: [],
      },
      {
        kind: 'changed' as ChangeKind,
        icon: Package,
        text: 'Bumped @aireon/shared to v0.40.0, which adds Markdown heading rendering to Claire\'s message formatter.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.3',
    date: 'May 30, 2026',
    codename: 'Full Reply',
    summary:
      'Claire now returns complete answers. Some replies were getting cut off mid-sentence: the assistant’s reasoning step was eating into the same token budget as its visible answer, so longer responses ran out of room before finishing. We’ve raised that budget so the reasoning pass no longer starves the reply. Picks up @aireon/shared v0.39.0.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Bot,
        text: 'Claire no longer cuts answers off mid-sentence. Her reply token budget was raised so the model’s internal reasoning step no longer truncates the visible response. Picks up the fix via @aireon/shared v0.39.0.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.2',
    date: 'May 30, 2026',
    codename: 'Axis & Order',
    summary:
      'Two fixes for the zone-distribution charts in the side pane. The numbers running down the left of the utilization-over-time and area-vs-volume charts were getting clipped at the pane edge - they now have room to render in full. And the utilization-over-time line was plotting its age cohorts in the wrong order (60 / 40 / 20 / ALL); it now reads ALL first, then the 20 / 40 / 60 windows ascending, so the trend flows left-to-right the way the caption promises.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BarChart3,
        text: 'Left Y-axis tick labels on the utilization-over-time and area-vs-volume charts no longer get cut off at the pane edge - the axes are sized to fit the numbers.',
        prs: [19],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Activity,
        text: 'The utilization-over-time line now orders its age cohorts as ALL → 20 → 40 → 60 instead of the scrambled 60 / 40 / 20 / ALL, so the densification trend reads correctly.',
        prs: [19],
      },
    ],
  },
  {
    version: '0.5.1',
    date: 'May 29, 2026',
    codename: 'Always Loads',
    summary:
      'Fixes a regression where the parcel info pane could spin forever and never load. The browser cache upgrade introduced in v0.4.0 could get blocked by another open tab, and because the data fetch waited on the cache first, it never reached the network. The cache is now strictly non-blocking - if it can’t open, the app loads straight from the network instead of hanging. Also adds an automated test suite so this class of bug is caught before every release.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Database,
        text: 'Info pane stuck loading: the IndexedDB cache could block on a version upgrade (e.g. when the app was open in another tab), and the parcel/zone fetch awaited it before hitting the network - so nothing loaded. The cache now times out / yields immediately when blocked, closes politely so it never blocks other tabs, and the data fetch always proceeds.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text: 'Added a Vitest test suite (cache resilience, parcel/zone services, density map expressions, stats) wired into a single `npm run verify` gate (typecheck + lint + test + build) run before every publish.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.0',
    date: 'May 29, 2026',
    codename: 'Studio Polish',
    summary:
      'A big usability pass for phones and a much more prominent “Save to PRM”. The right-side pane is now a proper bottom sheet on mobile - peek at the headline, drag the handle to expand to the full charts, and the map stays visible the whole time (it used to open as a 460px panel that covered the screen). And saving a parcel to your proom workspace is now a full-width call-to-action pinned to the bottom of the pane, visible on both the Zone distribution and Parcel facts tabs.',
    highlight: true,
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bookmark,
        text: 'Save to PRM is now a prominent, full-width button pinned to the bottom of the info pane - visible on both tabs, with clear Saving / Saved / Sign-in states and a quick “Open in proom” link. It used to be a small pill tucked in the Parcel-facts header.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text: 'Mobile: the info pane is a draggable bottom sheet now - peek height by default, tap the handle to expand to the full charts, map stays in view. Previously it opened as a fixed 460px rail that covered small screens.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: PanelsTopLeft,
        text: 'Tidied controls and tap targets on mobile (zoom control steps aside when the sheet is open; larger touch areas), and aligned spacing across desktop and phone.',
        prs: [],
      },
    ],
  },
  {
    version: '0.4.0',
    date: 'May 29, 2026',
    codename: 'Density Lens',
    summary:
      'The map now actually answers the question room exists for - “how densely is this zone built, and where does my parcel sit?”. Clicking a parcel paints its whole zone as a density choropleth straight off the vector tiles (no waiting), coloring every parcel by where its volume utilization falls in the zone, with the rest of the map dimmed so the zone reads as one block. A new legend decodes the ramp and drops a “You” marker at your parcel. Plus a real speed-up: the persistent cache that was silently broken now works, and the zone aggregate is warmed in parallel the instant you click.',
    highlight: true,
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text: 'Density choropleth now paints. It was keyed on a tile field that does not exist (`egrid`), so the map showed flat gray - it now keys on `parcel_id` and colors directly from each parcel’s `ratioV`.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Layers,
        text: 'Click a parcel → its entire zoning zone lights up as a utilization choropleth (cool = under-built, hot red = at/over the allowance), with out-of-zone parcels dimmed. Switching zones in the dropdown re-colors the map.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: BookOpen,
        text: 'New map legend decoding the density ramp against the zone’s own ratioV percentiles, with a “You” marker and a 100%-allowance reference line.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: BarChart3,
        text: 'Parcel-facts ratioV / ratioS read as honest percentages now (100% = built to allowance) instead of always pinning to 100% and flagging every parcel as over-built.',
        prs: [],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Database,
        text: 'The persistent (IndexedDB) zone-stats cache was never actually created - a second object store silently failed to initialise, so every reload re-paid the network cost. Fixed, so repeat visits are instant.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Zone statistics are now warmed in parallel the moment you click a parcel (using the tile’s own zone fields), and concurrent requests are de-duplicated - removing a sequential round-trip from the first-click wait.',
        prs: [],
      },
    ],
  },
  {
    version: '0.3.0',
    date: 'May 27, 2026',
    codename: 'Inter Polish',
    summary:
      'Typography refresh aligning room with the SwissNovo suite - UI body, headings, and panels now ride on Inter (variable, OpenType cv11 + ss01 + tabular figures, antialiased) for a more professional tech-grade dark look. Varela Round is preserved only for the room wordmark with the red `oo`. Parcel IDs and code surfaces switch to JetBrains Mono via the new `--room-mono` token.',
    highlight: true,
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Type,
        text: 'UI body, headings, and search inputs now ride on Inter (variable, OpenType cv11 + ss01 + tabular figures, antialiased) for a more professional tech-grade dark look.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text: 'Brand wordmark untouched: the room logo stays in Varela Round with the red `oo`.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Code2,
        text: 'IDs and code surfaces switch to JetBrains Mono via the new `--room-mono` token.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.3',
    date: 'May 27, 2026',
    codename: 'Studio Shortcut',
    summary:
      'Claire now offers a Studio shortcut - deep-link the current parcel into doorway with one tap.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Claire: Studio button - deep-link the current parcel into doorway.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.2',
    date: 'May 26, 2026',
    codename: 'Cadastral Fallback',
    summary:
      'Picked up the latest shared library - Claire now resolves parcel EGRID via cadastral identify as a fallback.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Updated @aireon/shared to v0.33.0 - Claire now resolves parcel EGRID via cadastral identify as a fallback.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.1',
    date: 'May 26, 2026',
    codename: 'Quiet Check-In',
    summary:
      'Release-notes button now uses the circle-check icon (matches the rest of the suite).',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Bumped @aireon/shared to v0.32.0 - release-notes button icon switched from Tag to CheckCircle.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.0',
    date: 'May 25, 2026',
    codename: 'Quatre Langues',
    summary:
      'room now speaks four languages. Pick English, French, German or Italian from the new flag selector in the top bar - the navbar, panels, modals, charts, tour and toasts all switch instantly, and your choice is remembered across visits.',
    highlight: true,
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Bookmark,
        text: 'Save the focused parcel to your PRM list - a new "Save to PRM" button now sits in the Parcel facts header, flips to "Saved" once stored, and offers a one-click link to open the record in proom.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Languages,
        text: 'Deep i18n pass: every user-facing string in room - navbar, layer controls, parcel-facts panel, zone-distribution charts, the "My Exports" modal, the location-permission modal, screenshot toasts, user menu, onboarding tour, error messages - is now translated to EN / FR / DE / IT. The LocaleSelector in the navbar (also new) lets you switch on the fly.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text: 'Language preference persists in localStorage under `room:locale` and falls back to your browser language on first visit. Missing strings degrade gracefully to English so nothing ever shows a raw translation key.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.8',
    date: 'May 25, 2026',
    codename: 'Already Loaded',
    summary:
      'Zone and parcel data now stick around between visits. The first click after a reload pulls from the browser instead of the network, so previously-seen parcels open instantly - no more 1–45 s wait while RES recomputes the same aggregate.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Two-layer cache for /api/zone-stats and /api/parcel-data: an in-memory Map for same-session re-clicks, and an IndexedDB store (database "room-cache") that survives reloads and tab closes. Mirrors the strategy scoore uses for its Overpass queries.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Database,
        text: 'Each persistent store gets a 50 MB LRU budget with no expiry - zone aggregates only change monthly, so cached entries stay valid until the budget evicts the least-recently-used ones. Cache lives entirely client-side; nothing leaves your browser.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.7',
    date: 'May 25, 2026',
    codename: 'Two Tabs, Full Height',
    summary:
      'The right-side info pane is now a two-tab UI - Zone distribution (default) and Parcel facts - each using the full pane height, so neither feels squeezed.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: PanelsTopLeft,
        text: 'Replaced the stacked 30/70 split with a tabbed panel: Zone distribution opens by default (the headline view); click Parcel facts to switch to the per-parcel reference (address, zoning, area, ratioV, freeV, height, floors). Each tab gets the full pane height, no scrolling fight between sections.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.6',
    date: 'May 25, 2026',
    codename: 'Call Claire',
    summary:
      'Claire now has a phone button in her header - click to start a live voice conversation with her, powered by Google\'s Gemini Live (Aoede voice). Same Claire, same parcel grounding; just speak naturally. Picks up @aireon/shared v0.25.1, which also adds an automatic 429/5xx fallback across Gemini chat models so Claire stays responsive when her primary model is rate-limited.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Phone,
        text: 'New phone button in Claire\'s header. Click it to start a live voice call - Claire listens, you speak naturally in DE/EN/FR/IT, and she answers out loud. Live transcript overlay shows both sides as you talk. Powered by Gemini 3.1 Flash Live preview (voice "Aoede").',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Bot,
        text: 'Claire\'s text chat now automatically retries on rate-limit / upstream errors by falling back through gemini-3.5-flash → 3.1-flash-lite → 3-flash-preview before giving up. Fewer apologetic error bubbles.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.5',
    date: 'May 25, 2026',
    codename: 'Right Runtime, Right Signature',
    summary:
      'The previous attempt at outlasting the cold-cache 504 silently broke the proxy - it switched runtimes but kept the wrong handler signature. Now using the Node (req, res) signature so the function actually runs.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Timer,
        text: 'Rewrote /api/zone-stats as a Node serverless function with the (req, res) handler signature (matching api/claire-pois.ts). The Web (Request)=>Response signature only fires on the Edge runtime - under runtime: "nodejs" it hangs until maxDuration. Token is now hardcoded for the same reason as claire-pois.ts (stale team-level env var would override).',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.4',
    date: 'May 25, 2026',
    codename: 'Cold Cache, Warm Reception',
    summary:
      'First-time clicks on previously-unseen zones no longer fail with a 504 - the proxy now waits long enough for the RES backend\'s cold SQL aggregate to finish, and the client retries once just in case.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Timer,
        text: '/api/zone-stats moved off the Edge runtime (~25s wall-time) onto the Node runtime with maxDuration: 60. RES /zone_stats takes ~45s on the first call for an uncached (fso, cz_local) - once cached, ~1s. Without this, the first user to query a zone got a 504.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Timer,
        text: 'Client-side retry once on 502/504 in zoneStatsService - by the time the retry fires, RES has cached the response, so the second attempt is sub-second.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.3',
    date: 'May 25, 2026',
    codename: 'Charts Get the Room',
    summary:
      'Rebalanced the right-hand info panel so the zone-distribution charts get most of the height - the parcel facts now occupy roughly the top third, the distribution panel the bottom two-thirds.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text: 'Right-side info panel now splits 30/70 between Parcel facts (top) and Zone distribution (bottom) instead of letting the facts block expand to fit its content and squeezing the charts.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.2',
    date: 'May 24, 2026',
    codename: 'Link Preview',
    summary:
      'Sharing a room link in Slack, WhatsApp, Discord, Teams etc. now shows a real screenshot of the app - the choropleth map with the zone-density panel - instead of the placeholder Bolt image.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Image,
        text: 'public/og-image.jpg replaced with a 2152×1107 frame of room in use (zone choropleth + distribution panel). Same dimensions as the existing og:image meta, so no index.html changes needed.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.1',
    date: 'May 24, 2026',
    codename: 'Zone Stats Online',
    summary:
      'Zone distribution charts now actually appear when you click a parcel - the parcel_data response uses RES\'s canonical fso_num field, which we weren\'t reading.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BarChart3,
        text: 'Read fso_num (and fso_num_2021) as aliases for fso when parsing /parcel_data - without this the zone-stats fetch was silently skipped and the right-hand distribution panel stayed empty.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.0',
    date: 'May 24, 2026',
    codename: 'How Dense, Really?',
    summary:
      'The first build of room - a map-first explorer that answers one core question: how densely built is this zone, and where does the selected parcel sit on the distribution?',
    highlight: true,
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Map,
        text: 'Map-first parcel selector with a choropleth fill: every parcel inside the selected zone is shaded by its utilization percentile, so you see density at a glance and the selected parcel is outlined.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: BarChart3,
        text: 'Zone summary panel: municipality, zoning category, sub-zone, parcel area, existing building volume, year of construction, floor-area proxy, ratioV and freeV - pulled live from the RES /parcel_data endpoint.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Activity,
        text: 'Six distribution histograms - ratioV, freeV, ratioS, GFZ, building height, number of floors - each with a "you are here" reference line marking the selected parcel.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Layers,
        text: 'Boxplot + density curve for the primary utilization metric, with min, max, median and main percentiles.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Sparkles,
        text: 'Percentile gauge: a 0–100 dial that shows where the selected parcel falls inside the zone distribution, with a human reading like "82% of comparable parcels are utilized more intensively."',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: ScatterChart,
        text: 'Scatter tab: parcel area vs. building volume for every comparable parcel in the zone, with a regression line and the selected parcel highlighted.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: BookOpen,
        text: 'Utilization-over-time line chart: mean ratioV across age cohorts (now, last 20 / 40 / 60 years) for the selected zone.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Sparkles,
        text: 'Zone switcher dropdown: room auto-selects the parcel\'s own zoning category, but you can switch to any other zone in the same municipality for comparison.',
        prs: [],
      },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
export const REPO_URL = 'https://github.com/mbuchi/room';
