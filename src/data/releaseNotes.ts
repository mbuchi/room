import {
  ShieldAlert,
  Sparkles, BarChart3, Activity, Layers, Map, BookOpen, ScatterChart, Image, LayoutPanelTop, Timer, Phone, Bot, PanelsTopLeft, Zap, Database, Languages, Bookmark, Type, BadgeCheck, Code2, MessageSquare, Package, Bug, Camera,
} from 'lucide-react';
import type { ChangeKind, ChangeItem, Release } from '@aireon/shared';

export type { ChangeKind, ChangeItem, Release };
export { KIND_META } from '@aireon/shared';

// Newest first. Versioning follows SemVer. room is pre-1.0 while the data
// model and visualisations stabilise.
export const RELEASES: Release[] = [
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
      'The parcel info panel now surfaces up to five nearby parcels that are for sale, ranked by distance, plot size and zone similarity — each a tappable card that flies the map there.',
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
          'Replaced room’s hand-rolled header and inline address search with the shared <AppNavbar> from @aireon/shared v1.18.1. Same look and behaviour — Mapbox address search, “Open with”, the Locate · Settings · Language toolbar and the account menu — with far less app-specific code.',
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
          'Refreshed the account menu via @aireon/shared v1.16.0: the profile button now sits beside the Active status line and is relabelled "edit", saved parcels gain an Open-in-proom shortcut, and the PRM pipeline is trimmed to four active stages.',
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
          'Replaced the hand-rolled navbar action row and its mobile overflow menu with the shared @aireon/shared MapToolbar (v1.15.0). Locate, a new Settings placeholder and the language picker now share one component — same icons, order and behaviour — and fold into a single ⋯ menu on phones.',
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
      'The basemap switcher now offers the shared swisstopo gallery — six Swiss-made basemaps with live map thumbnails — in place of the Mapbox styles.',
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
          'Added a swisstopo aerial thumbnail to the parcel info panel header — an 88px bird’s-eye preview of the selected parcel that expands to a full-size lightbox.',
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
          'Map screenshots now capture the actual map instead of a blank area — the WebGL canvas keeps its drawing buffer readable after the MapLibre renderer switch.',
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
      'room now draws the map with the open-source MapLibre GL engine instead of Mapbox GL. The basemaps, parcels and 3D buildings look and behave exactly as before — an under-the-hood switch that drops a proprietary dependency.',
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
          'Migrated the map renderer from Mapbox GL JS to the open-source, BSD-licensed MapLibre GL JS. The same Mapbox-hosted basemaps (Dark, Light, Streets, Satellite, …) are still used, so nothing changes visually — hover, click-to-select, the basemap switcher, 3D buildings and screenshots all work exactly as before.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.25',
    date: 'June 9, 2026',
    codename: 'Zoom to Select',
    summary:
      'Parcels are now only selectable once you have zoomed in to block level — the same threshold that already controls the hover highlight. Clicking while zoomed way out no longer picks the wrong tiny parcel.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text:
          'Clicking the map now only selects a parcel once you have zoomed in past block level — matching the hover highlight, which already appears only at that zoom. When the map is zoomed out to an overview, parcels are too small to target precisely, so clicks are ignored instead of selecting a near-random parcel. Searching an address or opening a ?lat/?lng link still works at any zoom (they fly in first).',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.24',
    date: 'June 9, 2026',
    codename: 'Open With',
    summary:
      'After you search an address, a new "Open with" button appears in the top bar — jump straight to the same spot in another Aireon app. The locate button also picks up the suite\'s shared navbar styling.',
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
      'The guided tour no longer blurs the page behind it. Each step still dims the background and spotlights the highlighted area — but everything now stays crisp and clear instead of fuzzy.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Removed the background blur from the guided tour. Tour steps still dim the page and spotlight the active element, but the rest of the screen now stays sharp instead of being blurred — clearer and more reliable across browsers.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.22',
    date: 'June 9, 2026',
    codename: 'Smooth Zoom-Out',
    summary:
      'The amber hover highlight now only kicks in once you’re zoomed in to block level. Zoomed further out — where the map can show thousands of parcels at once — it stays off, so panning and zooming stay smooth even on modest hardware.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text:
          'Gated the parcel hover highlight to block-level zoom (about z15 and closer). When you zoom out a lot the map can hold thousands of parcels, and re-painting the hover highlight on every mouse-move made low-spec machines stutter. Hover now switches off entirely while you’re zoomed out and returns the moment you zoom into a block — your selected parcel stays highlighted at every zoom.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.21',
    date: 'June 9, 2026',
    codename: 'Back to Hub',
    summary:
      'A small Aireon logo now sits at the left of the top bar, just before the room wordmark. Tap it to jump straight back to the Aireon hub — the same one-tap shortcut across every app in the suite.',
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
      'A cleaner top bar. The secondary tools — Export image, My Exports, What’s new and Take a tour — now live tidily under your account menu, so the bar keeps only what you reach for most: search, locate, language and your account.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: LayoutPanelTop,
        text:
          'Slimmed the top bar to the essentials — logo, address search, locate, language and your account. Export image, My Exports, What’s new (release notes) and Take a tour moved into a new “More tools” section inside the account menu, with a red dot on What’s new when there are updates you haven’t read. The tour and What’s new stay reachable even when you’re signed out.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.19',
    date: 'June 6, 2026',
    codename: 'Browse First',
    summary:
      'No sign-in pop-up on arrival — the zoning map opens straight away. You are only asked to sign in when you use a feature that needs an account, like tracking a parcel or exporting a snapshot.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Sparkles,
        text:
          'Dropped the welcome sign-in pop-up that used to appear on a fresh visit. room now opens directly into the map for everyone. The sign-in invitation appears only when you act on a feature that needs an account — tracking a parcel or exporting a screenshot — and it now opens as an in-app modal instead of bouncing you to the sign-in page.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.18',
    date: 'June 5, 2026',
    codename: 'One Sign-In',
    summary:
      'Sign in once, and you are signed in everywhere. room now joins suite-wide single sign-on, so if you are already logged in to another Aireon app in this browser, room signs you in automatically — no second password.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: BadgeCheck,
        text: "Cross-app single sign-on now works: if you're signed in to any Aireon app in this browser, room signs you in automatically on load — a brief, UI-less check, no second password. Anonymous visitors are unaffected.",
        prs: [],
      },
    ],
  },
  {
    version: '0.5.17',
    date: 'June 4, 2026',
    codename: 'Tour, Fixed',
    summary:
      'The guided tour is more reliable and far more useful. It now walks every step in order from the start — under the new React Compiler an old timing bug could leave it showing only some steps or none. The steps are also richer: clearer guidance to click the map for a parcel’s density and ranking, a new step on tracking a parcel to your proom workspace, and a plainer “N / M” progress counter.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Sparkles,
        text: 'Fixed the guided tour computing its step list during the first render — before the map and panel anchors had mounted — which under the React Compiler could leave it stuck showing 0 or only some steps. Steps are now computed from the live page the moment the tour starts, so every configured step appears in order.',
        prs: [],
      },
      {
        kind: 'improved' as ChangeKind,
        icon: Map,
        text: 'Rewrote the tour content to be concrete: the map step now spells out that clicking the map picks a parcel and shades its whole zone by built-volume percentile, and points to the facts and distribution panel it opens. Corrected the map step so it spotlights the map (it no longer just centres a blank tooltip).',
        prs: [],
      },
      {
        kind: 'added' as ChangeKind,
        icon: Bookmark,
        text: 'Added a tour step explaining how to track a parcel — saving it to your proom workspace, synced across the SwissNovo suite — plus a clearer step on reading the zone-distribution charts.',
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
      'The guided tour now softly blurs the page behind its overlay again — but the highlighted element stays perfectly sharp. Earlier the blur either covered the focused element too or had to be removed entirely; now only the surroundings go soft-focus, so your eye is drawn to exactly what the step is pointing at.',
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
      'The parcel-save button now reads “Track parcel” (was “Save to PRM”) so new users immediately get what it does — “PRM” was jargon. Localised across English, French, German and Italian.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Languages,
        text: 'Renamed the parcel-save action from “Save to PRM” to “Track parcel” (and “Saved to PRM” → “Tracked”) for new-user clarity, localised in en/fr/de/it. No change to behaviour — it still saves the parcel to your proom workspace.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.14',
    date: 'June 4, 2026',
    codename: 'Compiler On',
    summary:
      'Turned on the React Compiler 1.0 so the app memoizes itself at build time — fewer needless re-renders, with no change to how anything behaves.',
    items: [
      {
        kind: 'improved' as ChangeKind,
        icon: Zap,
        text: 'Enabled the React Compiler 1.0 (Babel plugin, target React 18) for automatic compile-time memoization — fewer needless re-renders, no behaviour change. Healthcheck: 29/29 components compiled.',
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
      'The +/- zoom control no longer disappears behind the density legend. When you select a parcel, the legend slides to the bottom-right to clear the detail panel — but the previous fix slid the zoom control to that exact same spot, so the legend sat on top of it. The zoom control now lives in the bottom-left corner, well clear of both the legend and the panel.',
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
        text: 'The guided product tour no longer blurs the background — the focused element and page stay sharp behind the dimmed tour overlay.',
        prs: [],
      },
    ],
  },
  {
    version: '0.5.9',
    date: 'June 3, 2026',
    codename: 'Step Aside',
    summary:
      'Fixes the desktop +/- zoom control getting covered by the right-hand detail panel. The control is meant to slide left when the panel opens, but an inline style was overriding the responsive rule that does the shifting, so on wider screens the control stayed put and the panel sat on top of it. The basemap/layers control was already shifting correctly — the zoom control now matches it.',
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
      'A small consistency pass to bring room back in line with the rest of the SwissNovo suite. The typography design tokens are restored to the suite-standard --hood- prefix (the previous rename to --room- was the drift, not the fix — every app forks hood and shares that namespace). Focus rings on the top-bar controls now use the keyboard-only focus-visible mechanism the rest of the suite uses, and Tailwind\'s class-based dark mode is now declared explicitly (room remains dark-only by design).',
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
        text: 'Top-bar controls (sign-in, user menu, screenshot button, zone-filter input, address search) now use focus-visible: focus rings appear only for keyboard navigation, with a ring offset for clarity on the dark bar — matching the suite-wide focus standard already used by the zoom control.',
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
        text: 'Claire\'s section headings no longer show literal "###" hashes — the shared chat renderer formats Markdown headings (#–######) as styled bold heading text.',
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
      'Two fixes for the zone-distribution charts in the side pane. The numbers running down the left of the utilisation-over-time and area-vs-volume charts were getting clipped at the pane edge — they now have room to render in full. And the utilisation-over-time line was plotting its age cohorts in the wrong order (60 / 40 / 20 / ALL); it now reads ALL first, then the 20 / 40 / 60 windows ascending, so the trend flows left-to-right the way the caption promises.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: BarChart3,
        text: 'Left Y-axis tick labels on the utilisation-over-time and area-vs-volume charts no longer get cut off at the pane edge — the axes are sized to fit the numbers.',
        prs: [19],
      },
      {
        kind: 'fixed' as ChangeKind,
        icon: Activity,
        text: 'The utilisation-over-time line now orders its age cohorts as ALL → 20 → 40 → 60 instead of the scrambled 60 / 40 / 20 / ALL, so the densification trend reads correctly.',
        prs: [19],
      },
    ],
  },
  {
    version: '0.5.1',
    date: 'May 29, 2026',
    codename: 'Always Loads',
    summary:
      'Fixes a regression where the parcel info pane could spin forever and never load. The browser cache upgrade introduced in v0.4.0 could get blocked by another open tab, and because the data fetch waited on the cache first, it never reached the network. The cache is now strictly non-blocking — if it can’t open, the app loads straight from the network instead of hanging. Also adds an automated test suite so this class of bug is caught before every release.',
    items: [
      {
        kind: 'fixed' as ChangeKind,
        icon: Database,
        text: 'Info pane stuck loading: the IndexedDB cache could block on a version upgrade (e.g. when the app was open in another tab), and the parcel/zone fetch awaited it before hitting the network — so nothing loaded. The cache now times out / yields immediately when blocked, closes politely so it never blocks other tabs, and the data fetch always proceeds.',
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
      'Typography refresh aligning room with the SwissNovo suite — UI body, headings, and panels now ride on Inter (variable, OpenType cv11 + ss01 + tabular figures, antialiased) for a more professional tech-grade dark look. Varela Round is preserved only for the room wordmark with the red `oo`. Parcel IDs and code surfaces switch to JetBrains Mono via the new `--room-mono` token.',
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
        text: 'Updated @aireon/shared to v0.33.0 — Claire now resolves parcel EGRID via cadastral identify as a fallback.',
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
        text: 'Bumped @aireon/shared to v0.32.0 — release-notes button icon switched from Tag to CheckCircle.',
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
      'Claire now has a phone button in her header — click to start a live voice conversation with her, powered by Google\'s Gemini Live (Aoede voice). Same Claire, same parcel grounding; just speak naturally. Picks up @aireon/shared v0.25.1, which also adds an automatic 429/5xx fallback across Gemini chat models so Claire stays responsive when her primary model is rate-limited.',
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
