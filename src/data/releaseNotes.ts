import {
  Sparkles, BarChart3, Activity, Layers, Map, BookOpen, ScatterChart, Image, LayoutPanelTop, Timer,
} from 'lucide-react';
import type { ChangeKind, ChangeItem, Release } from '@swissnovo/shared';

export type { ChangeKind, ChangeItem, Release };
export { KIND_META } from '@swissnovo/shared';

// Newest first. Versioning follows SemVer. room is pre-1.0 while the data
// model and visualisations stabilise.
export const RELEASES: Release[] = [
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
