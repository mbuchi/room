import {
  Sparkles, BarChart3, Activity, Layers, Map, BookOpen, ScatterChart, Image, LayoutPanelTop, Timer, Phone, Bot, PanelsTopLeft, Zap, Database, Languages, Bookmark, Type, BadgeCheck, Code2,
} from 'lucide-react';
import type { ChangeKind, ChangeItem, Release } from '@swissnovo/shared';

export type { ChangeKind, ChangeItem, Release };
export { KIND_META } from '@swissnovo/shared';

// Newest first. Versioning follows SemVer. room is pre-1.0 while the data
// model and visualisations stabilise.
export const RELEASES: Release[] = [
  {
    version: '0.5.0',
    date: 'May 29, 2026',
    codename: 'Studio Polish',
    summary:
      'A big usability pass for phones and a much more prominent “Save to PRM”. The right-side pane is now a proper bottom sheet on mobile — peek at the headline, drag the handle to expand to the full charts, and the map stays visible the whole time (it used to open as a 460px panel that covered the screen). And saving a parcel to your proom workspace is now a full-width call-to-action pinned to the bottom of the pane, visible on both the Zone distribution and Parcel facts tabs.',
    highlight: true,
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Bookmark,
        text: 'Save to PRM is now a prominent, full-width button pinned to the bottom of the info pane — visible on both tabs, with clear Saving / Saved / Sign-in states and a quick “Open in proom” link. It used to be a small pill tucked in the Parcel-facts header.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text: 'Mobile: the info pane is a draggable bottom sheet now — peek height by default, tap the handle to expand to the full charts, map stays in view. Previously it opened as a fixed 460px rail that covered small screens.',
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
      'The map now actually answers the question room exists for — “how densely is this zone built, and where does my parcel sit?”. Clicking a parcel paints its whole zone as a density choropleth straight off the vector tiles (no waiting), colouring every parcel by where its volume utilisation falls in the zone, with the rest of the map dimmed so the zone reads as one block. A new legend decodes the ramp and drops a “You” marker at your parcel. Plus a real speed-up: the persistent cache that was silently broken now works, and the zone aggregate is warmed in parallel the instant you click.',
    highlight: true,
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Map,
        text: 'Density choropleth now paints. It was keyed on a tile field that does not exist (`egrid`), so the map showed flat grey — it now keys on `parcel_id` and colours directly from each parcel’s `ratioV`.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Layers,
        text: 'Click a parcel → its entire zoning zone lights up as a utilisation choropleth (cool = under-built, hot red = at/over the allowance), with out-of-zone parcels dimmed. Switching zones in the dropdown re-colours the map.',
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
        text: 'The persistent (IndexedDB) zone-stats cache was never actually created — a second object store silently failed to initialise, so every reload re-paid the network cost. Fixed, so repeat visits are instant.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Zone statistics are now warmed in parallel the moment you click a parcel (using the tile’s own zone fields), and concurrent requests are de-duplicated — removing a sequential round-trip from the first-click wait.',
        prs: [],
      },
    ],
  },
  {
    version: '0.3.0',
    date: 'May 27, 2026',
    codename: 'Inter Polish',
    summary:
      'Typography refresh aligning room with the SwissNovo suite — UI body, headings, and panels now ride on Inter (variable, OpenType cv11 + ss01 + tabular figures, antialiased) for a more professional tech-grade dark look. Varela Round is preserved only for the room wordmark with the red `oo`. Parcel IDs and code surfaces switch to JetBrains Mono via the new `--hood-mono` token.',
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
        text: 'IDs and code surfaces switch to JetBrains Mono via the new `--hood-mono` token.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.3',
    date: 'May 27, 2026',
    codename: 'Studio Shortcut',
    summary:
      'Claire now offers a Studio shortcut — deep-link the current parcel into doorway with one tap.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Claire: Studio button — deep-link the current parcel into doorway.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.2',
    date: 'May 26, 2026',
    codename: 'Cadastral Fallback',
    summary:
      'Picked up the latest shared library — Claire now resolves parcel EGRID via cadastral identify as a fallback.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text: 'Updated @swissnovo/shared to v0.33.0 — Claire now resolves parcel EGRID via cadastral identify as a fallback.',
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
        text: 'Bumped @swissnovo/shared to v0.32.0 — release-notes button icon switched from Tag to CheckCircle.',
        prs: [],
      },
    ],
  },
  {
    version: '0.2.0',
    date: 'May 25, 2026',
    codename: 'Quatre Langues',
    summary:
      'room now speaks four languages. Pick English, French, German or Italian from the new flag selector in the top bar — the navbar, panels, modals, charts, tour and toasts all switch instantly, and your choice is remembered across visits.',
    highlight: true,
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Bookmark,
        text: 'Save the focused parcel to your PRM list — a new "Save to PRM" button now sits in the Parcel facts header, flips to "Saved" once stored, and offers a one-click link to open the record in proom.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Languages,
        text: 'Deep i18n pass: every user-facing string in room — navbar, layer controls, parcel-facts panel, zone-distribution charts, the "My Exports" modal, the location-permission modal, screenshot toasts, user menu, onboarding tour, error messages — is now translated to EN / FR / DE / IT. The LocaleSelector in the navbar (also new) lets you switch on the fly.',
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
      'Zone and parcel data now stick around between visits. The first click after a reload pulls from the browser instead of the network, so previously-seen parcels open instantly — no more 1–45 s wait while RES recomputes the same aggregate.',
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
        text: 'Each persistent store gets a 50 MB LRU budget with no expiry — zone aggregates only change monthly, so cached entries stay valid until the budget evicts the least-recently-used ones. Cache lives entirely client-side; nothing leaves your browser.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.7',
    date: 'May 25, 2026',
    codename: 'Two Tabs, Full Height',
    summary:
      'The right-side info pane is now a two-tab UI — Zone distribution (default) and Parcel facts — each using the full pane height, so neither feels squeezed.',
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
      'Claire now has a phone button in her header — click to start a live voice conversation with her, powered by Google\'s Gemini Live (Aoede voice). Same Claire, same parcel grounding; just speak naturally. Picks up @swissnovo/shared v0.25.1, which also adds an automatic 429/5xx fallback across Gemini chat models so Claire stays responsive when her primary model is rate-limited.',
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Phone,
        text: 'New phone button in Claire\'s header. Click it to start a live voice call — Claire listens, you speak naturally in DE/EN/FR/IT, and she answers out loud. Live transcript overlay shows both sides as you talk. Powered by Gemini 3.1 Flash Live preview (voice "Aoede").',
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
      'The previous attempt at outlasting the cold-cache 504 silently broke the proxy — it switched runtimes but kept the wrong handler signature. Now using the Node (req, res) signature so the function actually runs.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Timer,
        text: 'Rewrote /api/zone-stats as a Node serverless function with the (req, res) handler signature (matching api/claire-pois.ts). The Web (Request)=>Response signature only fires on the Edge runtime — under runtime: "nodejs" it hangs until maxDuration. Token is now hardcoded for the same reason as claire-pois.ts (stale team-level env var would override).',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.4',
    date: 'May 25, 2026',
    codename: 'Cold Cache, Warm Reception',
    summary:
      'First-time clicks on previously-unseen zones no longer fail with a 504 — the proxy now waits long enough for the RES backend\'s cold SQL aggregate to finish, and the client retries once just in case.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Timer,
        text: '/api/zone-stats moved off the Edge runtime (~25s wall-time) onto the Node runtime with maxDuration: 60. RES /zone_stats takes ~45s on the first call for an uncached (fso, cz_local) — once cached, ~1s. Without this, the first user to query a zone got a 504.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Timer,
        text: 'Client-side retry once on 502/504 in zoneStatsService — by the time the retry fires, RES has cached the response, so the second attempt is sub-second.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.3',
    date: 'May 25, 2026',
    codename: 'Charts Get the Room',
    summary:
      'Rebalanced the right-hand info panel so the zone-distribution charts get most of the height — the parcel facts now occupy roughly the top third, the distribution panel the bottom two-thirds.',
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
      'Sharing a room link in Slack, WhatsApp, Discord, Teams etc. now shows a real screenshot of the app — the choropleth map with the zone-density panel — instead of the placeholder Bolt image.',
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
      'Zone distribution charts now actually appear when you click a parcel — the parcel_data response uses RES\'s canonical fso_num field, which we weren\'t reading.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BarChart3,
        text: 'Read fso_num (and fso_num_2021) as aliases for fso when parsing /parcel_data — without this the zone-stats fetch was silently skipped and the right-hand distribution panel stayed empty.',
        prs: [],
      },
    ],
  },
  {
    version: '0.1.0',
    date: 'May 24, 2026',
    codename: 'How Dense, Really?',
    summary:
      'The first build of room — a map-first explorer that answers one core question: how densely built is this zone, and where does the selected parcel sit on the distribution?',
    highlight: true,
    items: [
      {
        kind: 'new' as ChangeKind,
        icon: Map,
        text: 'Map-first parcel selector with a choropleth fill: every parcel inside the selected zone is shaded by its utilisation percentile, so you see density at a glance and the selected parcel is outlined.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: BarChart3,
        text: 'Zone summary panel: municipality, zoning category, sub-zone, parcel area, existing building volume, year of construction, floor-area proxy, ratioV and freeV — pulled live from the RES /parcel_data endpoint.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Activity,
        text: 'Six distribution histograms — ratioV, freeV, ratioS, GFZ, building height, number of floors — each with a "you are here" reference line marking the selected parcel.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Layers,
        text: 'Boxplot + density curve for the primary utilisation metric, with min, max, median and main percentiles.',
        prs: [],
      },
      {
        kind: 'new' as ChangeKind,
        icon: Sparkles,
        text: 'Percentile gauge: a 0–100 dial that shows where the selected parcel falls inside the zone distribution, with a human reading like "82% of comparable parcels are utilised more intensively."',
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
        text: 'Utilisation-over-time line chart: mean ratioV across age cohorts (now, last 20 / 40 / 60 years) for the selected zone.',
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
