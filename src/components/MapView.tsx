import { useEffect, useRef, useState, useCallback, lazy, Suspense, type CSSProperties, type TouchEvent as ReactTouchEvent } from 'react';
// ⚠ TYPE-ONLY, deliberately. MapLibre is ~215 KB brotli, and a static value
// import here put it on room's eager path: MapView is reached straight from
// App.tsx, so the library was modulepreloaded from index.html and downloaded
// before React could render anything. It cannot be CONSTRUCTED until React has
// rendered the container anyway, so fetching it eagerly only starved the chunks
// React needs first. The two runtime uses (`Map`, `Marker`) now come from the
// `await import('maplibre-gl')` in the init effect below, which is the same
// idiom @aireon/shared's own mapBootstrap uses.
// The STYLESHEET stays eager (main.tsx) — see the note on the init effect.
import type * as maplibregl from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import {
  getInitialMapState,
  updateUrlParams,
} from '../lib/mapConfig';
import {
  addParcelLayers,
  addBuildingLayers,
  addBuildingExtrusion,
  densityFillColor,
  densityFillOpacity,
  densityLineColor,
  densityLineOpacity,
  isParcelInteractive,
  type ActiveZone,
} from '../lib/mapLayers';
import { wgs84ToLv95 } from '../lib/coordTransform';
import { fullParcelAddress } from '../lib/parcelAddress';
import { fetchParcelData, ParcelDataError, type ParcelData } from '../services/parcelDataService';
import { prefetchZoneStats, type ZoneStatsResponse } from '../services/zoneStatsService';
import DensityLegend from './DensityLegend';
import type { ScreenshotMetadata } from '../services/imageService';
import Navbar from './Navbar';
import ZoomControl from './ZoomControl';
import CoordinateDisplay from './CoordinateDisplay';
import ZoneInfoPanel from './ZoneInfoPanel';
// Lazy: ZonePanel pulls in the entire recharts/d3 charting stack (~120 KB gz),
// which nothing on the initial map view needs. Splitting it means the chunk
// only downloads when a parcel is first selected (the panel shows its own
// loading skeletons while zone stats fetch, so the brief Suspense gap blends
// into the existing loading state).
const ZonePanel = lazy(() => import('./ZonePanel'));
// Lazy for a different reason than ZonePanel: `BuildableMassingSection` itself
// rides in the shared barrel chunk that MapView already loads, so this split
// saves no bytes. What it defers is the WORK — mounting the massing section
// spins up a second MapLibre instance and issues its own RES spare_space
// lookup, and until now that happened on every single parcel selection because
// the section sat at the bottom of the parcel-facts scroll. Now it happens only
// when someone opens the tab.
const MassingPanel = lazy(() => import('./MassingPanel'));
import ParcelPanelHeader from './ParcelPanelHeader';
import MarketPanel from './MarketPanel';
import ComparePanel from './ComparePanel';
import FaqPanel from './FaqPanel';
import PrimaryActionsRow from './PrimaryActionsRow';
import TrackParcelButton from './TrackParcelButton';
import CompareToggleButton from './CompareToggleButton';
import type { CompareParcel } from '../contexts/CompareContext';
import {
  AboutModal,
  ClaireAssistant,
  MapContextMenu,
  MapControlDock,
  MapLegendChip,
  MapUnavailable,
  fetchIsAdmin,
  formatParcelAddress,
  isWebGLAvailable,
  PANEL_TOUCH_TARGET,
  PanelActionButton,
  ParcelDataExportButton,
  SegmentedTabs,
  useGlass,
  useIsMobile,
  getStoredTheme,
  setTheme,
  type MapContextMenuPoint,
  type MapContextParcel,
} from '@aireon/shared';
import {
  BasemapPicker,
  getBasemapStrings,
  resolveBasemapStyle,
  getBasemapOption,
  themeBasemapId,
  BASEMAP_OPTIONS,
} from '@aireon/shared/basemap';
import {
  getThemeOverride,
  getBasemapOverride,
  getOverlayOpacityOverride,
  registerUrlSyncProviders,
  syncMapUrl,
} from '@aireon/shared/url-params';
import {
  createOverlayOpacityController,
  OVERLAY_OPACITY_DEFAULT,
} from '@aireon/shared/map-overlay-opacity';
import { type LocateErrorCode } from './LocateButton';
import Toast from './Toast';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Braces } from 'lucide-react';
import RawJsonView from './RawJsonView';
import { useAuth } from '../auth/AuthContext';
import {
  RESIDENTIAL_TYPE_FILTERS,
  RESIDENTIAL_TYPE_STORAGE_KEY,
  loadResidentialTypeFilter,
  residentialTypeCondition,
  type ResidentialTypeFilter,
} from '../lib/residentialTypeFilter';

/**
 * Whether a map-init failure is "this client cannot do WebGL" rather than a
 * code defect. MapLibre reports these either as an Error whose message mentions
 * WebGL, or as the raw `webglcontextcreationerror` event object carrying a
 * `statusMessage` ("Could not create a WebGL context, ... GL_VENDOR = Disabled").
 * Deliberately narrow so a genuine init bug is never mistaken for one.
 */
function isWebGLContextError(error: unknown): boolean {
  if (!error) return false;
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message, error.name);
  else if (typeof error === 'string') parts.push(error);
  const bag = error as { message?: unknown; statusMessage?: unknown; type?: unknown };
  if (typeof bag.message === 'string') parts.push(bag.message);
  if (typeof bag.statusMessage === 'string') parts.push(bag.statusMessage);
  if (typeof bag.type === 'string') parts.push(bag.type);
  return /webgl|webglcontextcreationerror/i.test(parts.join(' '));
}

// i18n keys for the Residential type segmented control labels, keyed by mode.
const RESIDENTIAL_TYPE_LABEL_KEYS: Record<ResidentialTypeFilter, string> = {
  all: 'panel.restype.all',
  'single-unit': 'panel.restype.single_unit',
  'multi-unit': 'panel.restype.multi_unit',
};

// The parcel POLYGON display layers the residential-type filter narrows: the
// density fill and its hairline outline — the two layers that paint EVERY
// parcel. These carry no base `filter` today, so the residential condition is
// applied to each directly. All restores each captured original layer filter;
// the two unit modes combine their condition with that base filter.
//
// parcel-hit is deliberately excluded too: it is the transparent, unfiltered
// interaction surface used by hover, click, search/deep-link and context-menu
// hit-tests. Residential type therefore controls the visual choropleth without
// making parcels outside that group unselectable. Hover and selected highlights
// keep their independent parcel-id filters.
const RESIDENTIAL_FILTERED_LAYERS = [
  'parcel-fill',
  'parcel-outline',
] as const;

interface SelectedParcel {
  parcelId: string;
  egrid: string | null;
  props: Record<string, unknown>;
  lng: number;
  lat: number;
  /** The clicked parcel POLYGON geometry (vector-tile feature.geometry) —
   *  the lite base fed to the shared BuildableMassingSection simulator. */
  geometry: GeoJSON.Geometry | null;
}

interface MapContextState {
  point: MapContextMenuPoint;
  parcel: MapContextParcel | null;
  properties: Record<string, unknown> | null;
  geometry: GeoJSON.Geometry | null;
}

function contextString(properties: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

function toContextParcel(properties: Record<string, unknown>): MapContextParcel | null {
  const parcelId = contextString(properties, ['parcel_id', 'egrid', 'id_parcel', 'id']);
  if (!parcelId) return null;
  const municipality = contextString(properties, [
    'cityname', 'city', 'ort', 'gemeinde', 'municipality', 'fso_name_2021',
  ]);
  const address = contextString(properties, ['address', 'street', 'strasse', 'streetname']);
  return {
    parcelId,
    label: address || `Parcel ${parcelId}`,
    municipality,
    area: Number(properties['area_m2'] ?? properties['parcel_area'] ?? properties['flaeche']) || 0,
    subtitle: municipality,
    address: formatParcelAddress(properties) || undefined,
  };
}

// Polygon-centroid helpers for the "Nearby comparables" query.
type LngLatRing = [number, number][];
type ParcelFeatureGeometry = { type?: string; coordinates?: unknown };
function isLngLatRing(value: unknown): value is LngLatRing {
  return Array.isArray(value) && value.every((p) => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number');
}
function firstRingFromGeometry(geometry: ParcelFeatureGeometry): LngLatRing | null {
  const { coordinates } = geometry;
  if (!Array.isArray(coordinates)) return null;
  if (geometry.type === 'Polygon' && isLngLatRing(coordinates[0])) return coordinates[0];
  const fp = coordinates[0];
  if (geometry.type === 'MultiPolygon' && Array.isArray(fp) && isLngLatRing(fp[0])) return fp[0];
  return null;
}

// Width of the right-side parcel pane. Tuned to fit the 2-column histogram
// grid comfortably without dominating the map. The controls offset themselves
// by PANEL_OFFSET_PX whenever a parcel is selected so the panel never covers
// the layer/zoom buttons on md+ screens.
const PANEL_WIDTH_PX = 460;
const PANEL_OFFSET_PX = PANEL_WIDTH_PX + 16;

/**
 * The right pane's tab set — deliberately ONE flat level.
 *
 * room used to ship two tabs ("Zone distribution" / "Parcel facts") with a
 * second layer of tabs nested inside the first, while the parcel tab also
 * carried the market figures, the 3D massing simulator and the for-sale
 * comparables stacked below its own content. Everything past the ratio cards
 * was, in practice, invisible.
 *
 * Now each subject is one top-level tab with a one-word label, in reading
 * order: where the parcel sits in its zone, what the parcel is, what the local
 * market looks like, what could still be built, and what the app can answer.
 * 'compare' is appended only for admins (see ComparePanel).
 *
 * Labels are single words on purpose: at 460px the segmented control gives each
 * tab ~73px, and on a phone ~58px. Anything longer truncates.
 */
const PANEL_TAB_IDS = ['zone', 'parcel', 'market', 'massing', 'faq', 'compare'] as const;
type PanelTab = (typeof PANEL_TAB_IDS)[number];

/** i18n key per tab — kept beside the ids so a new tab can't ship unlabelled. */
const PANEL_TAB_LABEL_KEYS: Record<PanelTab, string> = {
  zone: 'panel.tabs.zone',
  parcel: 'panel.tabs.parcel',
  market: 'panel.tabs.market',
  massing: 'panel.tabs.massing',
  faq: 'panel.tabs.faq',
  compare: 'panel.tabs.compare',
};

// Initial theme: room keeps its signature dark look by default and only flips
// to light when the user has stored that choice. getStoredTheme reads the
// cross-app `aireon_theme` cookie (cookie wins over the localStorage mirror);
// null → room's dark default. The toggle then drives both the `dark` class and
// the BasemapPicker's theme-paired basemap via the shared setTheme.
//
// `?theme=dark|light` (URL_PARAMS_STANDARD.md) wins first when present — the
// <html>.dark class itself was already flipped synchronously in main.tsx
// (before this component, or even the RoomAccessGate loading skeleton, ever
// mounted), so this just has to seed React state to match. The override is
// never persisted here; only setTheme() (the in-app toggle) writes storage,
// and the mount-time sync effect below skips its very first write when an
// override is active so it can't echo the override back into the cookie.
const prefersDarkMode = (): boolean => {
  const override = getThemeOverride();
  if (override) return override === 'dark';
  return getStoredTheme() !== 'light';
};

// room's actual basemap id list, for validating ?basemap=<id> against — an
// unknown id in the URL must never reach the map (URL_PARAMS_STANDARD.md).
const BASEMAP_IDS = BASEMAP_OPTIONS.map((b) => b.id);

const MapView = () => {
  const { t, locale } = useI18n();
  const { isAuthenticated, getAccessToken, promptLogin } = useAuth();
  // Liquid Glass appearance level (0=Off, 1=Frosted, 2=Liquid). Drives the
  // translucent map chrome + the `data-glass` attribute on <html>.
  const { level: glassLevel } = useGlass();
  const glassOn = glassLevel > 0;
  // Phone vs. desktop, via the shared (max-width:767px) hook — the exact
  // complement of Tailwind's `md:`. Desktop gets the floating Claire launcher
  // as the single entry point; on phones the launcher is hidden and the
  // in-panel "Ask Claire" button is the entry point instead.
  const isMobile = useIsMobile();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // The lazily-imported MapLibre module. Written in the init effect one line
  // before `mapRef`, so anywhere `mapRef.current` is non-null this is too —
  // that is the invariant `handleLocate` relies on to build a Marker without
  // awaiting again.
  const maplibreRef = useRef<typeof maplibregl | null>(null);
  // WebGL preflight, run once. On GPU-less / headless / driver-blocklisted
  // clients (GL_VENDOR = Disabled) the MapLibre constructor fires
  // `webglcontextcreationerror` and throws, which room only surfaced as a
  // console.error out of the style-resolution chain — leaving a blank map area
  // with no explanation and flooding the Bug Tracker with an unactionable
  // `error` row (bug #900). Detect up front so we skip map construction
  // entirely and render the shared graceful fallback instead.
  const [webglOk] = useState(isWebGLAvailable);
  // Set when the map still fails to construct after a passing preflight (e.g.
  // the GL context is lost between detection and construction). Same fallback.
  const [mapInitFailed, setMapInitFailed] = useState(false);
  // Light/dark theme. Drives the `dark` class on <html>, the BasemapPicker's
  // theme-paired basemap and every `dark:` chrome variant.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(prefersDarkMode);
  // The basemap pairs with the active theme. The shared <BasemapPicker> owns the
  // open/close state, the live-thumbnail gallery, the style swap and the
  // theme pairing (pairWithTheme default-on) — room just mirrors the current id.
  // `?basemap=<id>` (URL_PARAMS_STANDARD.md) wins over the theme-derived
  // default for this page load only; invalid/unknown ids are ignored.
  const [selectedBasemap, setSelectedBasemap] = useState<string>(
    () => getBasemapOverride(BASEMAP_IDS) ?? themeBasemapId(prefersDarkMode()),
  );
  const [parcelOpacity, setParcelOpacity] = useState(0.6);
  const [buildingOpacity, setBuildingOpacity] = useState(0.75);
  // `?opacity=0..100` (URL_PARAMS_STANDARD.md): one factor over room's OWN data
  // layers, multiplying whatever the parcel and building sliders authored. The
  // swisstopo basemap underneath is never touched.
  const [overlayPct, setOverlayPct] = useState<number>(
    () => getOverlayOpacityOverride() ?? OVERLAY_OPACITY_DEFAULT,
  );
  const overlayPctRef = useRef(overlayPct);
  overlayPctRef.current = overlayPct;
  // Reads mapRef rather than capturing an instance: the map is constructed
  // asynchronously after the container mounts.
  const overlayRef = useRef(
    createOverlayOpacityController(() => mapRef.current, overlayPct),
  );
  // Deliberately EXCLUDES parcel-hit (the transparent fill-opacity:0 hit-test
  // layer that carries every mousemove/click), parcel-hover, parcel-selected
  // and parcel-selected-casing: those are interaction affordances, and fading
  // them would make hovering and the open parcel invisible. Ids that do not
  // exist in the current state (building-extrusion in 2D) are skipped silently.
  const registerOverlayLayers = useCallback(() => {
    overlayRef.current.register([
      'parcel-fill',
      'parcel-outline',
      'building-fill',
      'building-outline',
      'building-extrusion',
    ]);
  }, []);
  // `?view=3d` (URL_PARAMS_STANDARD.md) opens straight into 3D for this load.
  const [is3DMode, setIs3DMode] = useState(() => getInitialMapState().view === '3d');
  const [lv95Coords, setLv95Coords] = useState<[number, number] | null>(null);

  // Controlled open-state for the Claire assistant so the in-panel "Ask Claire"
  // button can open it. The floating launcher stays (showLauncher default-on),
  // so users get both entry points; both drive this one piece of state.
  const [claireOpen, setClaireOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  // Residential-type parcel filter (All / Single-unit / Multi-unit), persisted to
  // localStorage with migration from the former four-option values.
  const [residentialTypeFilter, setResidentialTypeFilter] = useState<ResidentialTypeFilter>(
    () => loadResidentialTypeFilter(),
  );

  const [selectedParcel, setSelectedParcel] = useState<SelectedParcel | null>(null);
  const [mapContext, setMapContext] = useState<MapContextState | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [parcelDataLoading, setParcelDataLoading] = useState(false);
  const [parcelDataError, setParcelDataError] = useState<string | null>(null);
  // Which tab is visible in the right-side info pane. 'zone' is the default
  // since the distribution charts are the main thing users come to room for;
  // resets to 'zone' on each new parcel selection so the user always lands on
  // the headline view. See PANEL_TABS below for the full flat set.
  const [panelTab, setPanelTab] = useState<PanelTab>('zone');
  // 'compare' is admin-only — see ComparePanel for why. The same flag also
  // gates the raw-JSON view below. Resolved once per session; a signed-out or
  // non-admin user simply never sees either surface. Starts `false` so the
  // window while the probe is in flight is treated as "not an admin" —
  // admin-only surfaces must default to hidden, never to visible.
  const [isAdmin, setIsAdmin] = useState(false);
  // Developer "raw JSON" view: when on, the tab content is replaced by a
  // scrollable dump of the clicked parcel's structured data (RES parcelData +
  // the raw tile feature props). ADMIN ONLY — that dump carries the same
  // valuation and market-signal fields the compare tab is gated for, so the
  // gate has to cover both. Deliberately NOT persisted (no localStorage, no
  // URL param): plain component state, reset whenever the panel closes, so
  // there is nothing that could resurrect the view for a later visitor.
  const [showRaw, setShowRaw] = useState(false);
  // Mobile only: the right pane becomes a bottom sheet. Suite mobile standard:
  // it OPENS full-height (just under the navbar); the grab handle can collapse
  // it to a peek as a user-initiated snap point, and every new selection
  // re-expands it. Ignored at md+ where the pane is a full-height right rail.
  const [sheetExpanded, setSheetExpanded] = useState(true);
  // Mobile drag-to-dismiss: track an active touch's start Y and the live
  // delta so we can both translate the sheet and decide whether to close
  // on release (threshold = 80px downward). Valoo pattern.
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const sheetDragStartYRef = useRef<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const locateMarkerRef = useRef<maplibregl.Marker | null>(null);
  /**
   * The zone the density choropleth is currently painting (FSO + cz_local +
   * optional ratio_v percentile breakpoints). Set the instant a parcel is
   * clicked — straight off the tile's own `cz_local`/`fso_num_2021` so the
   * map lights up with zero round-trip — then refined to the zone's true
   * percentile breakpoints once /zone_stats lands. `null` = nothing selected.
   */
  const [activeZone, setActiveZone] = useState<ActiveZone | null>(null);

  // Resolve the admin flag once per sign-in state. It gates the optional
  // 'compare' tab and the raw-JSON view, so a failed probe simply means "not an
  // admin" — never a blocked render, never a retry loop. Signed-out users skip
  // the call entirely and stay non-admin.
  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetchIsAdmin()
      .then((admin) => {
        if (!cancelled) setIsAdmin(admin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // If the admin flag flips off (sign-out) while an admin-only surface is open,
  // fall back: the compare tab returns to the default tab rather than rendering
  // a tab that no longer has a switcher entry, and the raw-JSON view closes so
  // the latent flag cannot re-open it later in the session. This effect is the
  // cleanup, NOT the gate — both surfaces are also gated in the same render
  // pass below, because an effect always runs one paint too late.
  useEffect(() => {
    if (!isAdmin) {
      setPanelTab((tab) => (tab === 'compare' ? 'zone' : tab));
      setShowRaw(false);
    }
  }, [isAdmin]);

  const selectedParcelRef = useRef<SelectedParcel | null>(null);
  selectedParcelRef.current = selectedParcel;
  const selectedBasemapRef = useRef(selectedBasemap);
  selectedBasemapRef.current = selectedBasemap;
  const is3DModeRef = useRef(is3DMode);
  is3DModeRef.current = is3DMode;
  const parcelOpacityRef = useRef(parcelOpacity);
  parcelOpacityRef.current = parcelOpacity;
  const buildingOpacityRef = useRef(buildingOpacity);
  buildingOpacityRef.current = buildingOpacity;
  const activeZoneRef = useRef<ActiveZone | null>(null);
  activeZoneRef.current = activeZone;

  // State→URL write-back (URL_PARAMS_STANDARD.md). Every updateUrlParams call
  // (map load + moveend) stamps these getters' current values, so a copied URL
  // reproduces the whole view — locale, theme, basemap and the 3D camera — not
  // just the position. The getters read refs because the providers are
  // registered once on mount and must never see a stale closure (the theme in
  // particular can change without a click, via the <html>.dark MutationObserver
  // below). pitch/bearing are read live off the map and only while 3D is on, so
  // they disappear from the URL in 2D. This is read-only with respect to app
  // state: nothing here persists anything.
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const isDarkModeRef = useRef(isDarkMode);
  isDarkModeRef.current = isDarkMode;
  useEffect(() => {
    registerUrlSyncProviders({
      lang: () => localeRef.current,
      theme: () => (isDarkModeRef.current ? 'dark' : 'light'),
      basemap: () => selectedBasemapRef.current,
      view: () => (is3DModeRef.current ? '3d' : null),
      pitch: () => (is3DModeRef.current ? (mapRef.current?.getPitch() ?? null) : null),
      bearing: () => (is3DModeRef.current ? (mapRef.current?.getBearing() ?? null) : null),
      // null at the default so an ordinary view never carries ?opacity=100.
      opacity: () =>
        overlayPctRef.current === OVERLAY_OPACITY_DEFAULT ? null : overlayPctRef.current,
    });
  }, []);
  // Re-stamp on state changes that do not move the map (language switch, theme
  // toggle, basemap pick, 3D toggle) — moveend covers everything else. Kept as
  // its own effect so it never disturbs the theme-persist effect's skip-once
  // accounting. Right after a 3D toggle the pitch easeTo is still running, so
  // the URL briefly reads the pre-ease pitch; the moveend writer corrects it
  // when the animation lands.
  useEffect(() => {
    syncMapUrl();
  }, [locale, isDarkMode, selectedBasemap, is3DMode, overlayPct]);

  // Ref mirror of the residential-type filter so map callbacks (basemap re-add,
  // initial load) read the freshest choice synchronously without re-binding.
  const residentialTypeFilterRef = useRef(residentialTypeFilter);
  residentialTypeFilterRef.current = residentialTypeFilter;

  // Original (base) filter of each residential-filtered layer, captured once
  // when the layers are created. Today every entry is null, but capturing keeps
  // the selected unit condition composable if a base filter is added upstream.
  // Idempotent across basemap-swap re-adds via the has()-guard.
  const originalLayerFiltersRef = useRef<Map<string, unknown>>(new Map());

  /**
   * Re-apply the density paint on the parcel-fill / parcel-outline layers from
   * the current `activeZoneRef` + opacity slider. Called on selection, zone
   * switch, opacity change, and after a basemap style swap re-adds the layers.
   */
  const applyParcelPaint = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const zone = activeZoneRef.current;
    const op = parcelOpacityRef.current;
    if (map.getLayer('parcel-fill')) {
      map.setPaintProperty('parcel-fill', 'fill-color', densityFillColor(zone));
      map.setPaintProperty('parcel-fill', 'fill-opacity', densityFillOpacity(zone, op));
    }
    if (map.getLayer('parcel-outline')) {
      map.setPaintProperty('parcel-outline', 'line-color', densityLineColor(zone));
      map.setPaintProperty('parcel-outline', 'line-opacity', densityLineOpacity(zone, op));
    }
    // These raw writes re-author the base opacity (this runs on selection, zone
    // switch and after every basemap swap, not just from the slider), so
    // re-register to re-capture the baseline and re-apply the ?opacity factor.
    overlayRef.current.register(['parcel-fill', 'parcel-outline']);
  }, []);
  const applyParcelPaintRef = useRef(applyParcelPaint);
  applyParcelPaintRef.current = applyParcelPaint;

  // Apply the residential-type condition to the base parcel display layers
  // (parcel-fill / parcel-outline). All restores the original base filter;
  // otherwise the residential condition is COMBINED via
  // ['all', <original>, cond] rather than replacing it. room has no on-map
  // parcel-labels layer and no colour-metric label filter, so there is no label
  // filter to fold in (unlike roofs) — the fill/outline layers are the whole
  // story here. Every op is guarded by getLayer() so it is a no-op during the
  // brief window between a basemap setStyle() and its layer re-add.
  const applyResidentialTypeFilter = useCallback(
    (map: maplibregl.Map, filter: ResidentialTypeFilter) => {
      const cond = residentialTypeCondition(filter);
      for (const id of RESIDENTIAL_FILTERED_LAYERS) {
        if (!map.getLayer(id)) continue;
        const original = originalLayerFiltersRef.current.get(id) ?? null;
        if (!cond) {
          map.setFilter(id, (original as maplibregl.FilterSpecification | null) ?? null);
        } else if (original) {
          const combined: unknown[] = ['all', original, cond];
          map.setFilter(id, combined as unknown as maplibregl.FilterSpecification);
        } else {
          map.setFilter(id, cond as unknown as maplibregl.FilterSpecification);
        }
      }
    },
    [],
  );
  const applyResidentialTypeFilterRef = useRef(applyResidentialTypeFilter);
  applyResidentialTypeFilterRef.current = applyResidentialTypeFilter;

  const selectParcelFromProps = useCallback((
    props: Record<string, unknown>,
    lng: number,
    lat: number,
    geometry: GeoJSON.Geometry | null = null,
  ) => {
    const map = mapRef.current;
    if (!map) return;

    const parcelId = (props.parcel_id as string) ?? '';
    // The tiles carry the federal EGRID in `parcel_id` (there is no `egrid`
    // field), so use that as the canonical id; keep the legacy egrid props as
    // a fallback for the parcel-data lookup.
    const egrid: string | null =
      (props.egrid as string) ?? (props.EGRID as string) ?? parcelId ?? null;

    if (map.getLayer('parcel-selected'))
      map.setFilter('parcel-selected', ['==', ['get', 'parcel_id'], parcelId]);
    if (map.getLayer('parcel-selected-casing'))
      map.setFilter('parcel-selected-casing', ['==', ['get', 'parcel_id'], parcelId]);

    // Light the zone up immediately from the tile's own fields — no waiting on
    // /zone_stats. ZonePanel later refines the breakpoints to the zone's real
    // ratio_v percentiles via onZoneStatsLoaded.
    const fso = Number(props.fso_num_2021 ?? props.fso_num ?? props.fso);
    const czLocal = (props.cz_local as string) ?? '';
    const nextZone: ActiveZone | null =
      Number.isFinite(fso) && czLocal ? { fso, czLocal } : null;
    // Drive the ref synchronously so applyParcelPaint sees the new zone right
    // now (React's state commit lands a tick later); then mirror into state
    // for the legend + re-renders.
    activeZoneRef.current = nextZone;
    setActiveZone(nextZone);
    applyParcelPaintRef.current();
    if (nextZone) {
      // Warm both cache layers in parallel with the parcel-data fetch so the
      // chart panel renders without a second cold round-trip.
      prefetchZoneStats({ fso: nextZone.fso, cz_local: nextZone.czLocal, lang: locale });
    }

    setSelectedParcel({ parcelId, egrid, props, lng, lat, geometry });
    setParcelData(null);
    setParcelDataError(null);
    setParcelDataLoading(true);
    setPanelTab('zone');
    // Suite mobile standard: every new selection presents the bottom sheet at
    // full height, even if the user collapsed the previous one to a peek.
    setSheetExpanded(true);

    fetchParcelData({ lng, lat, egrid })
      .then((data) => setParcelData(data))
      .catch((err) =>
        setParcelDataError(
          err instanceof ParcelDataError ? err.message :
          err instanceof Error ? err.message : t('error.unknown'),
        ),
      )
      .finally(() => setParcelDataLoading(false));
  }, [t, locale]);

  const selectParcelRef = useRef(selectParcelFromProps);
  selectParcelRef.current = selectParcelFromProps;

  // Pending auto-select retry chain (search pick / deep-link / context-menu
  // load). A new target cancels the previous chain so rapid picks don't stack
  // stale selections.
  const autoSelectCancelRef = useRef<(() => void) | null>(null);

  // Hit-test the parcel under `center` and select it. Returns true on a hit so
  // the retry chain below knows whether to keep waiting for tiles.
  const trySelectParcelAt = useCallback((map: maplibregl.Map, center: [number, number]): boolean => {
    // Querying a missing layer throws — a search select can race the style load.
    if (!map.getLayer('parcel-hit')) return false;
    const point = map.project(center);
    const features = map.queryRenderedFeatures(point, { layers: ['parcel-hit'] });
    if (features.length && features[0].properties) {
      selectParcelRef.current(
        features[0].properties,
        center[0],
        center[1],
        (features[0].geometry as GeoJSON.Geometry) ?? null,
      );
      return true;
    }
    return false;
  }, []);

  // Runs the hit-test once the parcel tiles under the target are actually
  // rendered. The vector tiles regularly finish AFTER the first 'idle' that
  // follows a fly-to (slow network), and a single-shot hit-test silently
  // missed in that window — the search then appeared to do nothing. Every
  // later tile batch fires another 'idle', so retry on those, capped so an
  // address with no parcel underneath (lake, foreign address) stops cleanly.
  // Matches woom's selectParcelWhenReady (ported suite-wide with valoo/groove).
  const selectParcelWhenReady = useCallback((map: maplibregl.Map, center: [number, number], maxAttempts = 6) => {
    autoSelectCancelRef.current?.();
    let attempts = 0;
    const tryHit = () => {
      if (trySelectParcelAt(map, center)) return;
      attempts += 1;
      if (attempts < maxAttempts) map.once('idle', tryHit);
    };
    autoSelectCancelRef.current = () => map.off('idle', tryHit);
    map.once('idle', tryHit);
  }, [trySelectParcelAt]);

  const handleLocationSelect = useCallback((center: [number, number], _placeName: string) => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({ center, zoom: 17, duration: 2000 });
    selectParcelWhenReady(map, center);
  }, [selectParcelWhenReady]);

  /**
   * Refine the choropleth once /zone_stats lands: pull the zone's real ratio_v
   * percentile breakpoints [p5,p25,p50,p75,p95] from the summary and re-paint
   * so each parcel is coloured by where it sits in its own zone's
   * distribution. Also realigns the active zone to the stats payload, which is
   * how a dropdown zone-switch recolours the map.
   */
  const handleZoneStatsLoaded = useCallback((stats: ZoneStatsResponse) => {
    const s = stats.summary?.ratio_v;
    const breakpoints =
      s && [s.p5, s.p25, s.p50, s.p75, s.p95].every((n) => Number.isFinite(n))
        ? [s.p5, s.p25, s.p50, s.p75, s.p95]
        : undefined;
    const zone: ActiveZone = {
      fso: stats.zone.fso,
      czLocal: stats.zone.cz_local,
      breakpoints,
    };
    activeZoneRef.current = zone;
    setActiveZone(zone);
    applyParcelPaintRef.current();
  }, []);

  const handleZoneStatsCleared = useCallback(() => {
    activeZoneRef.current = null;
    setActiveZone(null);
    applyParcelPaintRef.current();
  }, []);

  // Theme toggle. Flipping isDarkMode drives the <html> `dark` class (which
  // every `dark:` chrome variant + the tour read) and the persisted `theme`
  // key; the shared <BasemapPicker pairWithTheme> reacts to the new `dark` prop
  // and swaps the basemap light↔dark itself (until the user pins one).
  const toggleDarkMode = useCallback(() => setIsDarkMode((prev) => !prev), []);

  // Guards the theme-persist effect below so it skips exactly one write: the
  // mount-time run when a `?theme=` override is active (never persist it).
  const themeEffectRanRef = useRef(false);

  useEffect(() => {
    // setTheme writes the cross-app `aireon_theme` cookie + localStorage mirror
    // + the `.dark` class on <html>, and (when signed in) syncs the choice to
    // the member profile so it follows the user across devices.
    //
    // `?theme=dark|light` (URL_PARAMS_STANDARD.md) must never persist.
    // `isDarkMode`'s initial state already reflects it (see prefersDarkMode
    // above), so skip only the very first (mount) write when an override is
    // active — any later change (the toggle button, or the cross-app
    // mutation sync below) persists exactly as before.
    const isFirstRun = !themeEffectRanRef.current;
    themeEffectRanRef.current = true;
    if (isFirstRun && getThemeOverride()) return;
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Keep `isDarkMode` in lockstep with the `<html>.dark` class. The shared
  // MapUserMenu hydrates the signed-in user's profile after mount and calls
  // adoptStoredTheme(), which toggles the class directly — bypassing this
  // state, so the prop-driven chrome goes stale until the next toggle.
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setIsDarkMode(html.classList.contains('dark'));
    sync(); // catch a class flip between the initial useState and this effect
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Stamp the glass level onto <html> — the SAME element that carries `.dark` —
  // so the compound `.dark[data-glass='N']` glass tokens resolve in both themes.
  // <html> (not a wrapper div) so panels that portal to <body> still resolve.
  useEffect(() => {
    document.documentElement.setAttribute('data-glass', String(glassLevel));
  }, [glassLevel]);

  // Warm the lazy ZonePanel chunk (recharts stack) once the initial view has
  // had a moment to settle, so the first parcel tap opens instantly even on a
  // slow connection. Pure prefetch — nothing renders until a parcel is
  // selected, and a failed fetch just falls back to loading on demand.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      import('./ZonePanel').catch(() => {
        /* prefetch is best-effort; the lazy() in the render path still owns loading */
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  // Re-add room's own data layers after the shared <BasemapPicker> swaps the
  // style (setStyle wipes every source/layer the app added). This is exactly
  // what the old inline handleBasemapChange did in its style.load callback:
  // re-add the parcel + building layers, restore the selected-parcel highlight,
  // re-apply the density paint, and re-hydrate the 3D extrusion when active.
  // The map-level click/mousemove/moveend listeners are NOT re-bound here:
  // setStyle keeps map-level handlers, so re-adding them would stack duplicates.
  const handleBasemapApplied = useCallback((map: maplibregl.Map) => {
    addParcelLayers(map, parcelOpacityRef.current, activeZoneRef.current);
    addBuildingLayers(map, buildingOpacityRef.current);
    // Capture each residential-filtered layer's ORIGINAL base filter once (the
    // has()-guard makes it idempotent across basemap swaps), then honour any
    // persisted residential choice so the freshly re-added parcel
    // layers come back already narrowed.
    for (const id of RESIDENTIAL_FILTERED_LAYERS) {
      if (map.getLayer(id) && !originalLayerFiltersRef.current.has(id)) {
        originalLayerFiltersRef.current.set(id, map.getFilter(id) ?? null);
      }
    }
    applyResidentialTypeFilterRef.current(map, residentialTypeFilterRef.current);
    // Restore the selected-parcel highlight + density paint after the swap.
    const parcel = selectedParcelRef.current;
    if (parcel) {
      const f: maplibregl.FilterSpecification = ['==', ['get', 'parcel_id'], parcel.parcelId];
      if (map.getLayer('parcel-selected'))
        map.setFilter('parcel-selected', f);
      if (map.getLayer('parcel-selected-casing'))
        map.setFilter('parcel-selected-casing', f);
    }
    applyParcelPaintRef.current();
    if (is3DModeRef.current) {
      if (map.getLayer('building-fill'))
        map.setLayoutProperty('building-fill', 'visibility', 'none');
      if (map.getLayer('building-outline'))
        map.setLayoutProperty('building-outline', 'visibility', 'none');
      addBuildingExtrusion(map, buildingOpacityRef.current);
    }
    // LAST, once every layer above exists: the style swap destroyed them all
    // and they came back at their authored paint values, so the overlay factor
    // has to be re-captured and re-applied here or a basemap pick would reset
    // it to 100%.
    registerOverlayLayers();
  }, [registerOverlayLayers]);

  const handleParcelOpacityChange = useCallback((value: number) => {
    setParcelOpacity(value);
    parcelOpacityRef.current = value;
    applyParcelPaintRef.current();
  }, []);

  const handleBuildingOpacityChange = useCallback((value: number) => {
    setBuildingOpacity(value);
    if (mapRef.current) {
      if (mapRef.current.getLayer('building-fill'))
        mapRef.current.setPaintProperty('building-fill', 'fill-opacity', value);
      if (mapRef.current.getLayer('building-extrusion'))
        mapRef.current.setPaintProperty('building-extrusion', 'fill-extrusion-opacity', value);
      // Raw paint writes re-author the base opacity — re-register so the
      // ?opacity factor lands on the new slider value instead of being wiped.
      overlayRef.current.register(['building-fill', 'building-extrusion']);
    }
  }, []);

  const handleToggle3D = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const newMode = !is3DMode;
    setIs3DMode(newMode);

    if (newMode) {
      if (map.getLayer('building-outline'))
        map.setLayoutProperty('building-outline', 'visibility', 'none');
      if (map.getLayer('building-fill'))
        map.setLayoutProperty('building-fill', 'visibility', 'none');

      addBuildingExtrusion(map, buildingOpacity);
      if (map.getLayer('building-extrusion'))
        map.setLayoutProperty('building-extrusion', 'visibility', 'visible');
      // The extrusion was just created at its authored opacity — pick it up so
      // the 3D masses fade with the rest of the overlay.
      registerOverlayLayers();

      map.easeTo({ pitch: 60, duration: 500 });
    } else {
      if (map.getLayer('building-extrusion'))
        map.setLayoutProperty('building-extrusion', 'visibility', 'none');
      if (map.getLayer('building-fill'))
        map.setLayoutProperty('building-fill', 'visibility', 'visible');
      if (map.getLayer('building-outline'))
        map.setLayoutProperty('building-outline', 'visibility', 'visible');

      map.easeTo({ pitch: 0, duration: 500 });
    }
  }, [is3DMode, buildingOpacity, registerOverlayLayers]);

  const handleLocate = useCallback((coords: [number, number]) => {
    const map = mapRef.current;
    const gl = maplibreRef.current;
    // `gl` cannot be null while `map` is set (both are assigned together in the
    // init effect), but the compiler does not know that and this callback is
    // reachable from the navbar before the map finishes constructing.
    if (!map || !gl) return;

    if (locateMarkerRef.current) {
      locateMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'locate-marker';

    locateMarkerRef.current = new gl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);

    map.flyTo({ center: coords, zoom: 15, duration: 2000 });

    setToast({ message: t('map.locate.moved'), type: 'success' });
  }, [t]);

  const handleLocateError = useCallback((code: LocateErrorCode) => {
    setToast({ message: t(`map.locate.${code}`), type: 'error' });
  }, [t]);

  // Gather rendered parcel features around a point for the "Nearby comparables"
  // ranking. Reads straight off the vector tile — no backend call.
  const queryParcelsAround = useCallback((lng: number, lat: number, radiusDeg: number, limit = 50) => {
    const map = mapRef.current; if (!map) return [];
    const sw = map.project([lng - radiusDeg, lat - radiusDeg]);
    const ne = map.project([lng + radiusDeg, lat + radiusDeg]);
    const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [[Math.min(sw.x, ne.x), Math.min(sw.y, ne.y)], [Math.max(sw.x, ne.x), Math.max(sw.y, ne.y)]];
    const layers = ['parcel-hit'].filter((id) => map.getLayer(id));
    if (!layers.length) return [];
    const features = map.queryRenderedFeatures(bbox, { layers });
    const seen = new Set<string | number>();
    const out: Array<{ properties: Record<string, unknown>; lng: number; lat: number }> = [];
    for (const f of features) {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const id = (props.parcel_id ?? f.id) as string | number | undefined;
      if (id == null || seen.has(id)) continue; seen.add(id);
      const ring = firstRingFromGeometry(f.geometry as ParcelFeatureGeometry); if (!ring?.length) continue;
      let sx = 0, sy = 0; for (const [x, y] of ring) { sx += x; sy += y; }
      out.push({ properties: props, lng: sx / ring.length, lat: sy / ring.length });
      if (out.length >= limit) break;
    }
    return out;
  }, []);

  const handleFlyToParcel = useCallback((lng: number, lat: number) => {
    const map = mapRef.current; if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16.5), duration: 1200 });
  }, []);

  const handleCloseInfoPanel = useCallback(() => {
    setSelectedParcel(null);
    setParcelData(null);
    setParcelDataError(null);
    setParcelDataLoading(false);
    setShowRaw(false);
    if (mapRef.current?.getLayer('parcel-selected'))
      mapRef.current.setFilter('parcel-selected', ['==', ['get', 'parcel_id'], '']);
    if (mapRef.current?.getLayer('parcel-selected-casing'))
      mapRef.current.setFilter('parcel-selected-casing', ['==', ['get', 'parcel_id'], '']);
    handleZoneStatsCleared();
  }, [handleZoneStatsCleared]);

  // Touch handlers wire the mobile drag-down-to-dismiss gesture on the sheet's
  // grab handle (valoo ParcelInfoPanel pattern). While dragging, the sheet
  // follows the finger via translateY with transitions off; on release past
  // the threshold the panel closes, otherwise it springs back.
  const onSheetTouchStart = (e: ReactTouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    sheetDragStartYRef.current = touch.clientY;
    setSheetDragOffset(0);
  };
  const onSheetTouchMove = (e: ReactTouchEvent) => {
    const start = sheetDragStartYRef.current;
    if (start == null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const delta = touch.clientY - start;
    // Only follow downward drags; upward stays put (no rubber-banding).
    setSheetDragOffset(delta > 0 ? delta : 0);
  };
  const onSheetTouchEnd = () => {
    const offset = sheetDragOffset;
    sheetDragStartYRef.current = null;
    if (offset > 80) {
      handleCloseInfoPanel();
    }
    setSheetDragOffset(0);
  };

  // Segmented control: switch the residential-type filter. Guards against a
  // no-op, updates state + ref, persists to localStorage, and applies the new
  // condition to the parcel display layers. The selected parcel remains open
  // even when it is outside the visual group.
  const handleResidentialTypeChange = useCallback(
    (next: ResidentialTypeFilter) => {
      if (next === residentialTypeFilterRef.current) return;
      setResidentialTypeFilter(next);
      residentialTypeFilterRef.current = next;
      try {
        window.localStorage.setItem(RESIDENTIAL_TYPE_STORAGE_KEY, next);
      } catch {
        // localStorage unavailable (private mode / quota) — non-critical.
      }
      if (mapRef.current) applyResidentialTypeFilterRef.current(mapRef.current, next);
    },
    [],
  );

  const getCaptureMetadata = useCallback((): ScreenshotMetadata => {
    const map = mapRef.current;
    const parcel = selectedParcelRef.current;
    if (!map) {
      return {
        central_parcel_id: parcel?.parcelId ?? null,
        egrid: parcel?.egrid ?? null,
        basemap: selectedBasemapRef.current,
        is_3d_mode: is3DModeRef.current,
      };
    }
    const c = map.getCenter();
    return {
      central_lat: c.lat,
      central_lng: c.lng,
      zoom: map.getZoom(),
      tilt_degree: map.getPitch(),
      bearing_degree: map.getBearing(),
      central_parcel_id: parcel?.parcelId ?? null,
      egrid: parcel?.egrid ?? null,
      basemap: selectedBasemapRef.current,
      is_3d_mode: is3DModeRef.current,
    };
  }, []);

  useEffect(() => {
    // No usable WebGL context → nothing to draw into. Skip construction; the
    // render path below shows <MapUnavailable/> in place of the map + chrome.
    if (!webglOk) return;
    if (!mapContainerRef.current || mapRef.current) return;
    const container = mapContainerRef.current;

    const initialState = getInitialMapState();
    let cancelled = false;
    // Throttle native mousemove → coordinate state to one update per animation
    // frame. mousemove can fire far faster than 60fps, and setLv95Coords re-renders
    // the whole MapView tree (ZonePanel charts, Claire), so we coalesce to the
    // display refresh rate. Cancelled on mouseout and effect cleanup.
    let coordRafId: number | null = null;

    // Open on the swisstopo basemap that pairs with room's (always dark) theme.
    // resolveBasemapStyle returns a ready style spec (including any runtime
    // restyle for the minimal/dark variants); the shared <BasemapPicker> handles
    // every later swap.
    const initialBasemap = getBasemapOption(selectedBasemap);
    // ⚠ MapLibre is fetched HERE, not at module scope, so it stays off room's
    // eager path (see the type-only import at the top of this file). It rides
    // alongside the style request rather than after it, so deferring the
    // library costs no time-to-map: the style fetch was already the gate.
    //
    // ⚠ The STYLESHEET is not part of this. `maplibre-gl/dist/maplibre-gl.css`
    // is imported eagerly in main.tsx, ABOVE `./index.css`, and vite.config.ts
    // keeps `.css` out of the `maplibre` manualChunks bucket. If the stylesheet
    // ever rode this dynamic chunk instead, its <link> would be appended AFTER
    // index.css at runtime, and `.maplibregl-map{position:relative}` (0,1,0)
    // would beat Tailwind's `.absolute` (0,1,0) on source order — the container
    // loses `position:absolute`, `inset` goes inert, the box collapses to
    // height 0 and MapLibre silently draws into its 400x300 fallback. The
    // `.room-map-canvas` rule in index.css is the second belt. Do not "tidy"
    // any of the three.
    void Promise.all([import('maplibre-gl'), resolveBasemapStyle(initialBasemap)])
      .then(([maplibre, style]) => {
        if (cancelled || mapRef.current) return;

        maplibreRef.current = maplibre;
        const map = new maplibre.Map({
          container,
          style,
          center: initialState.center,
          // Deep-links (?lat/?lng) open at zoom ≥17 so the parcel under the
          // coordinates is rendered in the vector tiles and the auto-select
          // hit-test below reliably finds it. The floor itself now lives in
          // @aireon/shared/url-params (deepLinkZoom).
          zoom: initialState.hasUrlCoords ? initialState.deepLinkZoom : initialState.zoom,
          // `?view=3d` (URL_PARAMS_STANDARD.md) tilts the initial camera too —
          // extrusion layers alone at pitch 0 would look like a no-op. Falls
          // back to room's own 3D-toggle defaults (handleToggle3D below) when
          // the URL didn't also specify ?pitch/?bearing.
          ...(initialState.view === '3d'
            ? { pitch: initialState.pitch ?? 60, bearing: initialState.bearing ?? 0 }
            : {}),
          // Keep the WebGL backbuffer readable so screenshot/export captures
          // the map instead of a blank canvas (MapLibre v5 location).
          canvasContextAttributes: { preserveDrawingBuffer: true },
          // Disable the built-in attribution control — AboutModal carries the
          // swisstopo + MapLibre credits in the suite-standard pattern.
          attributionControl: false,
        });

        mapRef.current = map;

        map.on('load', () => {
          addParcelLayers(map, 0.6);
          addBuildingLayers(map, 0.85);
          // `?view=3d` (URL_PARAMS_STANDARD.md) opened is3DMode true — swap
          // straight to the extrusion instead of waiting for a manual 3D
          // toggle click. Mirrors handleBasemapApplied's own 3D branch below.
          if (is3DModeRef.current) {
            if (map.getLayer('building-fill'))
              map.setLayoutProperty('building-fill', 'visibility', 'none');
            if (map.getLayer('building-outline'))
              map.setLayoutProperty('building-outline', 'visibility', 'none');
            addBuildingExtrusion(map, buildingOpacityRef.current);
          }
          // Capture the parcel display layers' original (null) filters once, then
          // apply any persisted residential-type choice so the map opens already
          // narrowed to the saved unit group when that was the last selection.
          for (const id of RESIDENTIAL_FILTERED_LAYERS) {
            if (map.getLayer(id) && !originalLayerFiltersRef.current.has(id)) {
              originalLayerFiltersRef.current.set(id, map.getFilter(id) ?? null);
            }
          }
          applyResidentialTypeFilterRef.current(map, residentialTypeFilterRef.current);
          // LAST, after the parcel + building layers (and the ?view=3d
          // extrusion) exist, so a `?opacity=` in the opening URL is honored
          // on every one of them.
          registerOverlayLayers();
          const c = map.getCenter();
          updateUrlParams(c.lat, c.lng, map.getZoom());

          // Deep-link ?lat/?lng: retry the hit-test on each idle so parcel
          // tiles that finish after the first idle still get auto-selected.
          if (initialState.hasUrlCoords) {
            selectParcelWhenReady(map, initialState.center);
          }
        });

        map.on('mousemove', (e) => {
          const { lng, lat } = e.lngLat;
          if (coordRafId != null) return;
          coordRafId = requestAnimationFrame(() => {
            setLv95Coords(wgs84ToLv95(lng, lat));
            coordRafId = null;
          });
        });

        map.on('mouseout', () => {
          if (coordRafId != null) {
            cancelAnimationFrame(coordRafId);
            coordRafId = null;
          }
          setLv95Coords(null);
        });

        map.on('click', 'parcel-hit', (e) => {
          // Mirror the hover gate: parcels are only selectable once zoomed to block
          // level. Below that the map is an overview — clicks would land on the
          // wrong tiny parcel — so we ignore them. Address-search and ?lat/?lng
          // deep-links fly to z17 first, so those selection paths stay unaffected.
          if (!isParcelInteractive(map.getZoom())) return;
          if (!e.features?.length) return;
          const feature = e.features[0];
          const props = feature.properties;
          if (!props) return;
          selectParcelRef.current(
            props,
            e.lngLat.lng,
            e.lngLat.lat,
            (feature.geometry as GeoJSON.Geometry) ?? null,
          );
        });

        map.on('moveend', () => {
          const c = map.getCenter();
          updateUrlParams(c.lat, c.lng, map.getZoom());
        });

        map.on('contextmenu', (event) => {
          event.originalEvent.preventDefault();
          const feature = map.getLayer('parcel-hit')
            ? map.queryRenderedFeatures(event.point, { layers: ['parcel-hit'] })[0]
            : undefined;
          const properties = feature?.properties as Record<string, unknown> | undefined;
          const canvasRect = map.getCanvas().getBoundingClientRect();
          const original = event.originalEvent as MouseEvent;
          setMapContext({
            point: {
              x: Number.isFinite(original.clientX) ? original.clientX : canvasRect.left + event.point.x,
              y: Number.isFinite(original.clientY) ? original.clientY : canvasRect.top + event.point.y,
              lng: event.lngLat.lng,
              lat: event.lngLat.lat,
              zoom: map.getZoom(),
            },
            parcel: properties ? toContextParcel(properties) : null,
            properties: properties ?? null,
            geometry: (feature?.geometry as GeoJSON.Geometry | undefined) ?? null,
          });
        });
      })
      .catch((error) => {
        // The isWebGLAvailable() preflight above already skips the common case.
        // Reaching here means either (a) the GL context died between detection
        // and construction, or (b) something else in the init chain broke.
        // Case (a) is a client-environment condition, not a code defect — log it
        // as a warning so the shared console.error mirror does NOT file it in
        // the Bug Tracker as an `error` (bug #900); real failures still do.
        if (!cancelled) setMapInitFailed(true);
        if (isWebGLContextError(error)) {
          console.warn('room: WebGL context unavailable, showing map fallback', error);
          return;
        }
        console.error('Unable to initialise the MapLibre map', error);
      });

    return () => {
      cancelled = true;
      autoSelectCancelRef.current?.();
      autoSelectCancelRef.current = null;
      if (coordRafId != null) {
        cancelAnimationFrame(coordRafId);
        coordRafId = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // webglOk is set once from a `useState` initializer and never changes, so
    // this stays a mount-once effect in practice; it is listed so the guard
    // above is honestly part of the dependency set.
  }, [webglOk]);

  // Keep ZoneInfoPanel's address aware of the I18n locale by re-rendering
  // when locale changes — the parcel-data fetch itself isn't re-issued.
  void locale;

  const focusedHandle = selectedParcel
    ? {
        parcelId: selectedParcel.parcelId,
        lng: selectedParcel.lng,
        lat: selectedParcel.lat,
        props: selectedParcel.props,
      }
    : null;

  /* Suite data-card standard primary-actions row. On phones it carries the
     in-context "Ask Claire" action (the floating launcher is hidden there) as a
     full-width calm button; on desktop the launcher is the single Claire entry
     point, so onAskClaire is undefined and the row renders nothing. The
     cross-app "Open in" drop-up was removed suite-wide — the navbar "Open
     with" menu is the single launch point. Per the suite standard the row is
     NOT pinned below the scroll area: every tab renders it as the LAST section
     of its scrollable content (actionsSlot). The raw-JSON view omits it.

     The FAQ tab is the one exception: it leads with its own Ask Claire card, so
     it passes no actions slot at all rather than repeat the same button one
     scroll below. */
  const panelActionsRow = (
    <PrimaryActionsRow
      focusedParcel={focusedHandle}
      onAskClaire={isMobile ? () => setClaireOpen(true) : undefined}
    />
  );

  /* Tab switcher entries — 'compare' only exists for admins. */
  const visibleTabIds: PanelTab[] = PANEL_TAB_IDS.filter(
    (id) => id !== 'compare' || isAdmin,
  );

  /* Is the raw-JSON developer view actually on screen? DERIVED from the admin
     flag, not merely reset by the effect above: the dump must never render for
     a non-admin, and `showRaw && isAdmin` settles that in the SAME render pass
     — while the admin probe is still in flight, while it is failing, and in the
     frame after the flag drops, all of which an effect-only reset would leave
     visible for one paint. Hiding the toggle button is not a gate either; this
     is. Same idiom as the 'compare' tab. */
  const rawJsonOpen = showRaw && isAdmin;

  /* ── WebGL-unavailable fallback ────────────────────────────────────────────
     No GPU / headless / blocklisted driver / lost context: there is no canvas
     to render into, so every map control below would be inert. Show the shared
     notice (with the navbar kept for branding, theme and About) instead of the
     silent blank area room used to leave behind (bug #900). */
  if (!webglOk || mapInitFailed) {
    return (
      <div className="relative w-full h-dvh">
        <Navbar
          onLocationSelect={handleLocationSelect}
          onLocate={handleLocate}
          onLocateError={handleLocateError}
          getCaptureMetadata={getCaptureMetadata}
          darkMode={isDarkMode}
          onToggleTheme={toggleDarkMode}
          onAbout={() => setShowAboutModal(true)}
          selectedParcel={null}
          activeAddress={undefined}
        />
        <div className="absolute inset-0 top-14">
          <MapUnavailable
            message={t('panel.map.unavailable_title')}
            description={t('panel.map.unavailable_body')}
            dark={isDarkMode}
          />
        </div>
        {showAboutModal && (
          <AboutModal
            wordmark={<>r<span className="text-red-600">oo</span>m</>}
            description={t('about.description')}
            credits={[
              {
                label: t('about.mapData'),
                name: '© swisstopo',
                href: 'https://www.swisstopo.admin.ch',
              },
              {
                label: t('about.renderer'),
                name: 'MapLibre GL',
                href: 'https://maplibre.org',
              },
            ]}
            closeLabel={t('about.close')}
            aboutLabel={t('about.label')}
            creditsLabel={t('about.credits')}
            hubLabel={t('about.hub')}
            glassLevel={glassLevel}
            dark={isDarkMode}
            onClose={() => setShowAboutModal(false)}
          />
        )}
      </div>
    );
  }

  const compareParcel: CompareParcel | null =
    selectedParcel && selectedParcel.lat != null && selectedParcel.lng != null
      ? {
          id: parcelData?.egrid ?? selectedParcel.egrid ?? selectedParcel.parcelId ?? `${selectedParcel.lat.toFixed(6)},${selectedParcel.lng.toFixed(6)}`,
          label: parcelData?.address_full || fullParcelAddress(selectedParcel.props) || selectedParcel.egrid || 'Selected Parcel',
          lng: selectedParcel.lng,
          lat: selectedParcel.lat,
          properties: { ...selectedParcel.props, ...(parcelData ?? {}) },
          enrichment: null,
          addedAt: new Date().toISOString(),
        }
      : null;

  return (
    <div className="relative w-full h-dvh">
      <Navbar
        onLocationSelect={handleLocationSelect}
        onLocate={handleLocate}
        onLocateError={handleLocateError}
        getCaptureMetadata={getCaptureMetadata}
        darkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
        onAbout={() => setShowAboutModal(true)}
        selectedParcel={selectedParcel}
        /* Full "Street HouseNo Zip City", so a map click writes the same string
           into the search box as picking that address from the dropdown. RES
           first (it's the authoritative row), falling back to the clicked tile's
           own properties — which carry address/zip/cityname at every zoom, and
           still answer while /parcel_data is in flight or served from a cache
           written before address_full existed. */
        activeAddress={
          parcelData?.address_full ?? fullParcelAddress(selectedParcel?.props)
        }
      />
      {/* ⚠ `room-map-canvas` is not decoration: it re-states this box's
          position and geometry at (0,2,0) so maplibre-gl.css cannot win the
          equal-specificity tie on `.maplibregl-map` (which MapLibre stamps onto
          this very element) and collapse the map to height 0. See the block of
          the same name in index.css. */}
      <div
        ref={mapContainerRef}
        className="room-map-canvas absolute inset-0 top-14"
        data-tour="map-view"
      />

      <MapContextMenu
        open={mapContext !== null}
        point={mapContext?.point ?? null}
        parcel={mapContext?.parcel ?? null}
        currentAppId="room"
        locale={locale}
        darkMode={isDarkMode}
        loadLabel={t('map.context.load_label')}
        loadHint={t('map.context.load_hint')}
        auth={{ isAuthenticated, getAccessToken, promptLogin }}
        onClose={() => setMapContext(null)}
        onLoadParcel={(point) => {
          const map = mapRef.current;
          if (!map) return;
          if (mapContext?.properties) {
            selectParcelRef.current(mapContext.properties, point.lng, point.lat, mapContext.geometry);
            return;
          }
          map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(point.zoom ?? 17, 17), duration: 900 });
          selectParcelWhenReady(map, [point.lng, point.lat]);
        }}
        onCenterMap={(point) => {
          mapRef.current?.easeTo({ center: [point.lng, point.lat], zoom: point.zoom, duration: 700 });
        }}
      />

      {/* Basemap selector — the shared @aireon/shared/basemap gallery picker
          (6 swisstopo basemaps). room keeps its floating wrapper + tour anchor;
          the picker owns the open/close state, the live-thumbnail gallery, the
          style swap and theme pairing, and re-adds room's own data layers via
          onBasemapApplied. The picker pairs the basemap to the active theme
          (pairWithTheme default-on) until the user pins one. */}
      <div data-tour="layer-controls" className="absolute aireon-map-control-top aireon-map-control-left aireon-z-map-control max-w-[calc(100vw-2rem)]">
        <BasemapPicker
          map={mapRef.current}
          dark={isDarkMode}
          value={selectedBasemap}
          onChange={setSelectedBasemap}
          labels={{
            control: t('panel.basemap.fallback'),
            options: getBasemapStrings(locale).options,
            overlayOpacity: getBasemapStrings(locale).overlayOpacity,
          }}
          opacity={overlayPct}
          onOpacityChange={(pct) => {
            setOverlayPct(pct);
            overlayRef.current.set(pct);
          }}
          onBasemapApplied={handleBasemapApplied}
        />
      </div>

      {/* --- Map control cards (parcel opacity / building opacity / 3D) ---
          Desktop: floating stack positioned right, shifts left when panel opens.
          Mobile:  FAB bottom-right → bottom sheet with tabbed cards (no scroll). */}
      {(() => {
        const { level: _gl } = { level: glassLevel };
        const cardSurface = glassOn
          ? 'glass-control border'
          : 'shadow-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50';

        // fullWidth = embedded in the mobile Map-tools sheet, where every card
        // stacks always-visible and full-width (suite mobile standard); false =
        // the floating desktop card stack with its fixed min width.
        const renderParcelCard = (fullWidth: boolean) => (
          <div className={`${cardSurface} rounded-lg p-4 ${fullWidth ? 'w-full' : 'min-w-[240px]'} transition-colors`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('panel.layers.parcel')}</span>
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 tabular-nums">{Math.round(parcelOpacity * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={parcelOpacity}
              onChange={(e) => handleParcelOpacityChange(parseFloat(e.target.value))}
              aria-label={t('panel.layers.parcel')}
              className="w-full slider-groove"
            />
          </div>
        );

        const renderBuildingCard = (fullWidth: boolean) => (
          <div className={`${cardSurface} rounded-lg p-4 ${fullWidth ? 'w-full' : 'min-w-[240px]'} transition-colors`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('panel.layers.building')}</span>
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 tabular-nums">{Math.round(buildingOpacity * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={buildingOpacity}
              onChange={(e) => handleBuildingOpacityChange(parseFloat(e.target.value))}
              aria-label={t('panel.layers.building')}
              className="w-full slider-groove"
            />
          </div>
        );

        // Residential-type filter card: All / Single-unit / Multi-unit. All
        // combines both `bldg_flats` groups. Segmented control styled to match
        // room's control cards (red accent for the active segment, same surface).
        const renderResidentialTypeCard = (fullWidth: boolean) => (
          <div className={`${cardSurface} rounded-lg p-4 ${fullWidth ? 'w-full' : 'min-w-[276px]'} transition-colors`} data-tour="residential-type">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('panel.restype.title')}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg p-0.5 bg-gray-100 dark:bg-gray-700/60">
              {RESIDENTIAL_TYPE_FILTERS.map((rt) => {
                const active = residentialTypeFilter === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => handleResidentialTypeChange(rt)}
                    aria-pressed={active}
                    className={`w-full whitespace-nowrap px-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      active
                        ? 'bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {t(RESIDENTIAL_TYPE_LABEL_KEYS[rt])}
                  </button>
                );
              })}
            </div>
          </div>
        );

        return (
          <MapControlDock
            dark={isDarkMode}
            fabLabel={t('nav.map_settings_open')}
            sheetTitle={t('nav.map_settings')}
            /* The offset class must be a LITERAL: Tailwind's JIT only emits an
               arbitrary value it can see as a literal token in the source, so an
               interpolated `!right-[${PANEL_OFFSET_PX}px]` produced no CSS rule and
               the dock stayed at its default 1rem inset, hidden under the panel.
               476px = PANEL_OFFSET_PX (PANEL_WIDTH_PX 460 + 16) — keep in sync; the
               ZoomControl and ClaireAssistant take the same constant as props below
               (the shared launcher adds 20px on top: right = 496px, clear of both
               the pane and the zoom stack).
               `!` beats .aireon-map-control-right{right:var(--aireon-map-control-inset)}. */
            desktopClassName={`transition-[right] duration-300 ${selectedParcel ? '!right-[476px]' : ''}`}
          >
            {isMobile ? (
              /* Suite mobile standard: no tabs — every control card stacks
                 always-visible and full-width inside the one Map-tools sheet. */
              <div className="flex flex-col gap-3">
                {renderParcelCard(true)}
                {renderResidentialTypeCard(true)}
                {renderBuildingCard(true)}
              </div>
            ) : (
              <>
                {renderParcelCard(false)}
                {renderResidentialTypeCard(false)}
                {renderBuildingCard(false)}
              </>
            )}
          </MapControlDock>
        );
      })()}
      {/* Suite-standard zoom/compass control — pinned bottom-RIGHT, shifting clear
          of the info pane (PANEL_OFFSET_PX) when a parcel is selected, exactly like
          the MapControlDock and density legend. Hidden on phones once the parcel
          bottom-sheet is up. */}
      <ZoomControl
        getMap={() => mapRef.current}
        isDarkMode={isDarkMode}
        is3D={is3DMode}
        onToggle3D={handleToggle3D}
        rightOffsetPx={selectedParcel ? PANEL_OFFSET_PX : null}
        className={`bottom-24 md:bottom-8 ${selectedParcel ? 'hidden md:block' : ''}`}
      />
      {selectedParcel && (
        <div
          // The non-glass panel surface carries a large `shadow-2xl`; on desktop
          // it's a right rail whose drop-shadow bleeds a faint vertical strip onto
          // the map in saved images. data-screenshot-deshadow blanks that shadow
          // only during capture (live UI unchanged) via suppressCaptureShadows().
          data-screenshot-deshadow=""
          // Tour anchor for the "parcel-facts" step (tour.config.ts). Must be a
          // SINGLE exact value: TourProvider matches [data-tour='...'] with
          // querySelector, so space-separated multi-values never match.
          data-tour="zone-info-panel"
          className={`z-30 flex flex-col ${glassOn ? 'glass-surface' : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl'}
            fixed inset-x-0 bottom-0 h-[var(--sheet-h)] rounded-t-2xl border-t border-gray-200 dark:border-gray-800/60 animate-slide-up pb-[env(safe-area-inset-bottom)]
            md:absolute md:top-14 md:right-0 md:bottom-0 md:inset-x-auto md:h-auto md:max-h-none md:rounded-none md:border-t-0 md:border-l md:w-[var(--panel-w)] md:animate-slide-in-right md:pb-0`}
          style={
            {
              // Expanded = FULL HEIGHT (suite mobile standard): from just under
              // the 3.5rem navbar to the bottom edge. Peek keeps the map visible.
              '--sheet-h': sheetExpanded ? 'calc(100dvh - 3.5rem)' : '56dvh',
              '--panel-w': `${PANEL_WIDTH_PX}px`,
              // Live drag offset only applies during the gesture; when the
              // touch ends the transform clears in the same frame so the
              // sheet springs back (or unmounts if past the close threshold).
              ...(sheetDragOffset > 0
                ? { transform: `translateY(${sheetDragOffset}px)`, transition: 'none' }
                : {}),
            } as CSSProperties & Record<string, string>
          }
        >
          {/* Mobile grab handle — tap toggles peek ↔ expand, drag down past the
              threshold dismisses the sheet (suite mobile standard). Hidden at
              md+. The visible handle row is only ~26px tall, so an invisible
              absolutely-positioned overlay extends the tap target upward past
              the sheet's rounded top edge (~40px total) without moving any
              pixels. A tap that close to the sheet edge is aimed at the sheet,
              not the map behind it. */}
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            onTouchCancel={onSheetTouchEnd}
            aria-label={sheetExpanded ? t('panel.sheet.collapse') : t('panel.sheet.expand')}
            className="md:hidden relative flex-shrink-0 w-full flex items-center justify-center pt-2.5 pb-1.5 touch-none group"
          >
            <span aria-hidden="true" className="absolute inset-x-0 -top-3.5 bottom-0" />
            <span className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-400 dark:group-hover:bg-gray-600 group-active:bg-gray-500 transition-colors" />
          </button>
          {/* ── Panel header ──────────────────────────────────────────────
              ONE identity block for every tab: address, municipality, aerial
              thumbnail and the two copyable identifier chips (EGRID, Lat/Lng).
              Close stays beside the address while the Track, Compare, and raw-JSON
              actions sit directly below the subtitle, matching roofs. */}
          <ParcelPanelHeader
            parcelData={parcelData}
            isLoading={parcelDataLoading}
            focusedParcel={focusedHandle}
            darkMode={isDarkMode}
            onClose={handleCloseInfoPanel}
            actions={
              <>
                {/* Suite action order (PANEL_ACTIONS_STANDARD): Track first,
                    Compare second, raw-JSON third, export fourth; close stays beside the title. */}
                <TrackParcelButton focusedParcel={focusedHandle} parcelData={parcelData} darkMode={isDarkMode} />
                {compareParcel && (
                  <CompareToggleButton parcel={compareParcel} darkMode={isDarkMode} />
                )}
                {/* Raw-JSON toggle: admins only. The dump behind it carries the
                    parcel's valuation and market-signal fields verbatim, so it
                    rides on the same gate as the compare tab. Non-admins (and
                    everyone while the admin probe is still resolving) get no
                    button — and, more to the point, no view: see rawJsonOpen. */}
                {isAdmin && (parcelData || selectedParcel) && (
                  <PanelActionButton
                    icon={<Braces size={16} />}
                    label={t('panel.info.toggle_raw_json')}
                    onClick={() => setShowRaw((value) => !value)}
                    ariaPressed={rawJsonOpen}
                    dark={isDarkMode}
                    tone={rawJsonOpen ? 'active' : 'ghost'}
                    className={PANEL_TOUCH_TARGET}
                  />
                )}
                <ParcelDataExportButton
                  appId="room"
                  data={{ ...selectedParcel.props, ...(parcelData ?? {}) }}
                  additionalData={{ res: parcelData, feature: selectedParcel.props }}
                  coordinates={{ lng: selectedParcel.lng, lat: selectedParcel.lat }}
                  parcelId={parcelData?.egrid ?? selectedParcel.egrid ?? selectedParcel.parcelId}
                  address={parcelData?.address_full ?? fullParcelAddress(selectedParcel.props)}
                  geometry={selectedParcel.geometry}
                  dark={isDarkMode}
                  printLocale={locale}
                  className={PANEL_TOUCH_TARGET}
                />
              </>
            }
          />

          {/* ── Tab strip ─────────────────────────────────────────────────
              Its own full-width row now that the close/raw-JSON buttons moved
              into the header, which is what makes five (six for admins)
              one-word tabs fit without truncating.
              Tour anchor for the "charts" step — the chart content itself only
              mounts on its own tab, so it can't carry a reliable anchor. Keep
              ONE value per data-tour; the panel root carries "zone-info-panel". */}
          <div
            // `overflow-x-auto` is the locale safety net, not decoration.
            // Measured at a 375px sheet: the five default tabs fit in every
            // locale, but the admin sixth ("Compare") pushes the French and
            // Italian rows past the container (IT 353px into 339px). Without a
            // scroller that becomes horizontal page scroll, which is a standing
            // suite defect. `min-w-full w-max` keeps the desktop look identical
            // — the row still stretches to fill 460px and the segments still
            // divide it evenly — and only grows past the container when the
            // labels genuinely cannot fit. Scrollbar hidden so the pane never
            // shows two.
            className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800/60 px-3 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-tour="zone-charts"
          >
            <SegmentedTabs<PanelTab>
              tabs={visibleTabIds.map((id) => ({ id, label: t(PANEL_TAB_LABEL_KEYS[id]) }))}
              value={panelTab}
              onChange={setPanelTab}
              ariaLabel={t('panel.tabs.aria')}
              dark={isDarkMode}
              size="sm"
              activeTone="accent"
              className="min-w-full w-max"
            />
          </div>

          {/* Scrollable tab content — flex-1 so the Save CTA footer stays pinned.
              When the raw-JSON developer view is on, it replaces the tab body
              with a dump of the clicked parcel's richest structured data (the
              RES parcelData response) plus the raw tile feature properties.
              `rawJsonOpen` — not `showRaw` — is the gate: admins only. */}
          {rawJsonOpen ? (
            <RawJsonView
              value={{ res: parcelData, feature: selectedParcel.props }}
              labels={{
                title: t('panel.info.raw_json'),
                copy: t('panel.info.copy'),
                copied: t('panel.info.copied'),
              }}
            />
          ) : panelTab === 'zone' ? (
            <Suspense fallback={<div className="flex-1 min-h-0" aria-hidden="true" />}>
              <ZonePanel
                parcelData={parcelData}
                onZoneStatsLoaded={handleZoneStatsLoaded}
                onZoneStatsCleared={handleZoneStatsCleared}
                darkMode={isDarkMode}
                actionsSlot={panelActionsRow}
              />
            </Suspense>
          ) : panelTab === 'parcel' ? (
            <ZoneInfoPanel
              parcelData={parcelData}
              isLoading={parcelDataLoading}
              error={parcelDataError}
              darkMode={isDarkMode}
              actionsSlot={panelActionsRow}
            />
          ) : panelTab === 'market' ? (
            <MarketPanel
              parcelData={parcelData}
              darkMode={isDarkMode}
              actionsSlot={panelActionsRow}
            />
          ) : panelTab === 'massing' ? (
            <Suspense fallback={<div className="flex-1 min-h-0" aria-hidden="true" />}>
              <MassingPanel
                parcelData={parcelData}
                focusedParcel={focusedHandle}
                geometry={selectedParcel.geometry}
                darkMode={isDarkMode}
                actionsSlot={panelActionsRow}
              />
            </Suspense>
          ) : panelTab === 'compare' ? (
            <ComparePanel
              focusedParcel={focusedHandle}
              queryNearbyParcels={queryParcelsAround}
              onJumpTo={handleFlyToParcel}
              darkMode={isDarkMode}
              actionsSlot={panelActionsRow}
            />
          ) : (
            /* No actionsSlot: the FAQ tab's own Ask Claire card IS the row's
               only remaining content now that "Open in" has retired, and
               showing it twice one scroll apart reads as a bug. */
            <FaqPanel onAskClaire={() => setClaireOpen(true)} />
          )}

        </div>
      )}
      {selectedParcel && (
        <ClaireAssistant
          appName="room"
          voiceCallEnabled
          open={claireOpen}
          onOpenChange={setClaireOpen}
          panelOpen={!!selectedParcel}
          zoomPanelOffsetPx={PANEL_OFFSET_PX}
          hideLauncherOnMobile
          darkMode={isDarkMode}
          properties={selectedParcel.props}
          lngLat={{ lng: selectedParcel.lng, lat: selectedParcel.lat }}
          headerAddress={
            typeof selectedParcel.props.address === 'string'
              ? selectedParcel.props.address
              : undefined
          }
        />
      )}
      {/* --- Density legend: MapLegendChip on mobile; desktop = always-visible card
          pinned bottom-LEFT (its base position). The bottom-right corner now hosts
          the zoom control, so the legend no longer shifts clear of the panel. --- */}
      {selectedParcel && activeZone && (
        isMobile ? (
          <div className="absolute bottom-6 left-4 z-10" data-tour="density-legend">
            <MapLegendChip
              open={legendOpen}
              onOpen={() => setLegendOpen(true)}
              onClose={() => setLegendOpen(false)}
              chipLabel={t('legend.title')}
              collapseLabel={t('panel.legend.collapse')}
              dark={isDarkMode}
            >
              <DensityLegend
                zone={activeZone}
                selectedRatioV={parcelData?.ratio_v ?? null}
                inline
              />
            </MapLegendChip>
          </div>
        ) : (
          <DensityLegend
            zone={activeZone}
            selectedRatioV={parcelData?.ratio_v ?? null}
          />
        )
      )}

      {showAboutModal && (
        <AboutModal
          wordmark={<>r<span className="text-red-600">oo</span>m</>}
          description={t('about.description')}
          credits={[
            {
              label: t('about.mapData'),
              name: '\u00a9 swisstopo',
              href: 'https://www.swisstopo.admin.ch',
            },
            {
              label: t('about.renderer'),
              name: 'MapLibre GL',
              href: 'https://maplibre.org',
            },
          ]}
          closeLabel={t('about.close')}
          aboutLabel={t('about.label')}
          creditsLabel={t('about.credits')}
          hubLabel={t('about.hub')}
          glassLevel={glassLevel}
          dark={isDarkMode}
          onClose={() => setShowAboutModal(false)}
        />
      )}

      <CoordinateDisplay coords={lv95Coords} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default MapView;
