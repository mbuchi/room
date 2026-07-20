import { useEffect, useRef, useState, useCallback, lazy, Suspense, type CSSProperties, type TouchEvent as ReactTouchEvent } from 'react';
import * as maplibregl from 'maplibre-gl';
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
import SaveToPrmBar from './SaveToPrmBar';
import {
  AboutModal,
  ClaireAssistant,
  CloseButton,
  MapContextMenu,
  MapControlDock,
  MapLegendChip,
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
} from '@aireon/shared/basemap';
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

// i18n keys for the Residential type segmented control labels, keyed by mode.
const RESIDENTIAL_TYPE_LABEL_KEYS: Record<ResidentialTypeFilter, string> = {
  none: 'panel.restype.none',
  all: 'panel.restype.all',
  houses: 'panel.restype.houses',
  apartments: 'panel.restype.apartments',
};

// The parcel POLYGON display layers the residential-type filter narrows: the
// density fill and its hairline outline — the two layers that paint EVERY
// parcel. These carry no base `filter` today, so the residential condition is
// applied to each directly, but applyResidentialTypeFilter still restores each
// layer's captured original filter when switching back to 'all' so it stays
// correct if a base filter is ever added.
//
// Deliberately EXCLUDED (room-specific, unlike roofs which uses feature-state
// for these): `parcel-hover`, `parcel-selected` and `parcel-selected-casing`.
// room drives those three via a dynamic `['==', ['get','parcel_id'], id]`
// filter set on hover/click, so any residential clause we set on them would be
// clobbered on the very next mousemove/click. It is also unnecessary: both the
// hover and click hit-tests run against `parcel-fill` (see wireParcelHover and
// the `click`/`queryRenderedFeatures` calls), so once `parcel-fill` is filtered
// a hidden parcel can no longer be hovered or newly selected. A parcel that was
// ALREADY selected when the filter changes is separately deselected in
// handleResidentialTypeChange so no orphan highlight lingers.
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

// Combined panel width — ZoneInfoPanel + ZonePanel stack vertically inside
// a single right-side column. Tuned to fit the 2-column histogram grid
// comfortably without dominating the map. The controls offset themselves by
// PANEL_OFFSET_PX whenever a parcel is selected so the panel never covers
// the layer/zoom buttons on md+ screens.
const PANEL_WIDTH_PX = 460;
const PANEL_OFFSET_PX = PANEL_WIDTH_PX + 16;

// Initial theme: room keeps its signature dark look by default and only flips
// to light when the user has stored that choice. getStoredTheme reads the
// cross-app `aireon_theme` cookie (cookie wins over the localStorage mirror);
// null → room's dark default. The toggle then drives both the `dark` class and
// the BasemapPicker's theme-paired basemap via the shared setTheme.
const prefersDarkMode = (): boolean => getStoredTheme() !== 'light';

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
  // Light/dark theme. Drives the `dark` class on <html>, the BasemapPicker's
  // theme-paired basemap and every `dark:` chrome variant.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(prefersDarkMode);
  // The basemap pairs with the active theme. The shared <BasemapPicker> owns the
  // open/close state, the live-thumbnail gallery, the style swap and the
  // theme pairing (pairWithTheme default-on) — room just mirrors the current id.
  const [selectedBasemap, setSelectedBasemap] = useState<string>(() =>
    themeBasemapId(prefersDarkMode()),
  );
  const [parcelOpacity, setParcelOpacity] = useState(0.6);
  const [buildingOpacity, setBuildingOpacity] = useState(0.85);
  const [is3DMode, setIs3DMode] = useState(false);
  const [lv95Coords, setLv95Coords] = useState<[number, number] | null>(null);

  // Controlled open-state for the Claire assistant so the in-panel "Ask Claire"
  // button can open it. The floating launcher stays (showLauncher default-on),
  // so users get both entry points; both drive this one piece of state.
  const [claireOpen, setClaireOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  // Residential-type parcel filter (All / Houses / Apartments), persisted to
  // localStorage. 'all' applies no filter (room shows every parcel — its default).
  const [residentialTypeFilter, setResidentialTypeFilter] = useState<ResidentialTypeFilter>(
    () => loadResidentialTypeFilter(),
  );

  const [selectedParcel, setSelectedParcel] = useState<SelectedParcel | null>(null);
  const [mapContext, setMapContext] = useState<MapContextState | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [parcelDataLoading, setParcelDataLoading] = useState(false);
  const [parcelDataError, setParcelDataError] = useState<string | null>(null);
  // Which tab is visible in the right-side info pane. Charts ('zone') are
  // the default since they're the main thing users come to room for; the
  // 'facts' tab is the per-parcel reference. Resets to 'zone' on each
  // new parcel selection so the user always lands on the headline view.
  const [panelTab, setPanelTab] = useState<'zone' | 'facts'>('zone');
  // Developer "raw JSON" view: when on, the tab content is replaced by a
  // scrollable dump of the clicked parcel's structured data (RES parcelData +
  // the raw tile feature props). Reset whenever the panel closes.
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

  // Ref mirror of the residential-type filter so map callbacks (basemap re-add,
  // initial load) read the freshest choice synchronously without re-binding.
  const residentialTypeFilterRef = useRef(residentialTypeFilter);
  residentialTypeFilterRef.current = residentialTypeFilter;

  // Original (base) filter of each residential-filtered layer, captured once
  // when the layers are created, so switching back to 'all' restores exactly
  // what was there before instead of clobbering with null. Today every entry is
  // null (neither parcel-fill nor parcel-outline has a base filter), but
  // capturing keeps the combine/restore logic correct if a base filter is ever
  // added upstream. Idempotent across basemap-swap re-adds via the has()-guard.
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
  }, []);
  const applyParcelPaintRef = useRef(applyParcelPaint);
  applyParcelPaintRef.current = applyParcelPaint;

  // Apply the residential-type condition to the base parcel display layers
  // (parcel-fill / parcel-outline). For 'all' (cond === null) each layer is
  // restored to its captured original filter (null today). When a layer already
  // has an original base filter, the residential condition is COMBINED via
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
    if (!map.getLayer('parcel-fill')) return false;
    const point = map.project(center);
    const features = map.queryRenderedFeatures(point, { layers: ['parcel-fill'] });
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

  useEffect(() => {
    // setTheme writes the cross-app `aireon_theme` cookie + localStorage mirror
    // + the `.dark` class on <html>, and (when signed in) syncs the choice to
    // the member profile so it follows the user across devices.
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
    // persisted non-'all' residential choice so the freshly re-added parcel
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
  }, []);

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
  }, [is3DMode, buildingOpacity]);

  const handleLocate = useCallback((coords: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    if (locateMarkerRef.current) {
      locateMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'locate-marker';

    locateMarkerRef.current = new maplibregl.Marker({ element: el })
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
    const layers = ['parcel-fill', 'parcel-hover', 'parcel-3d'].filter((id) => map.getLayer(id));
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

  // `true` when a parcel satisfies the given residential filter. Mirrors
  // residentialTypeCondition's expression semantics in plain JS so we can tell
  // whether the currently-selected parcel survives a filter change. 'none' is
  // room's escape hatch (no filter — always true); 'all' means the parcel
  // carries at least one building (bldg_count > 0); houses/apartments read
  // bldg_flats (exactly one / two-or-more dwellings).
  const parcelMatchesResidentialFilter = useCallback(
    (props: Record<string, unknown>, filter: ResidentialTypeFilter): boolean => {
      if (filter === 'none') return true;
      if (filter === 'all') {
        const count = Number(props.bldg_count ?? 0);
        return (Number.isFinite(count) ? count : 0) > 0;
      }
      const flats = Number(props.bldg_flats ?? 0);
      const n = Number.isFinite(flats) ? flats : 0;
      return filter === 'houses' ? n === 1 : n >= 2;
    },
    [],
  );

  // Segmented control: switch the residential-type filter. Guards against a
  // no-op, updates state + ref, persists to localStorage, and applies the new
  // condition to the parcel display layers. If the currently-selected parcel is
  // now filtered out, close the info panel too so no orphan selection outline
  // lingers over a hidden parcel (parcel-selected is not in the filtered set).
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
      const selected = selectedParcelRef.current;
      if (selected && !parcelMatchesResidentialFilter(selected.props, next)) {
        handleCloseInfoPanel();
      }
    },
    [parcelMatchesResidentialFilter, handleCloseInfoPanel],
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
    void resolveBasemapStyle(initialBasemap)
      .then((style) => {
        if (cancelled || mapRef.current) return;

        const map = new maplibregl.Map({
          container,
          style,
          center: initialState.center,
          zoom: initialState.hasUrlCoords ? Math.max(initialState.zoom, 17) : initialState.zoom,
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
          // Capture the parcel display layers' original (null) filters once, then
          // apply any persisted residential-type choice so the map opens already
          // narrowed to Houses/Apartments when that was the last selection.
          for (const id of RESIDENTIAL_FILTERED_LAYERS) {
            if (map.getLayer(id) && !originalLayerFiltersRef.current.has(id)) {
              originalLayerFiltersRef.current.set(id, map.getFilter(id) ?? null);
            }
          }
          applyResidentialTypeFilterRef.current(map, residentialTypeFilterRef.current);
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

        map.on('click', 'parcel-fill', (e) => {
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
          const feature = map.getLayer('parcel-fill')
            ? map.queryRenderedFeatures(event.point, { layers: ['parcel-fill'] })[0]
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
  }, []);

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
      <div ref={mapContainerRef} className="absolute inset-0 top-14" data-tour="map-view" />

      <MapContextMenu
        open={mapContext !== null}
        point={mapContext?.point ?? null}
        parcel={mapContext?.parcel ?? null}
        currentAppId="room"
        locale={locale}
        darkMode={isDarkMode}
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

        // Residential-type filter card: All / Houses / Apartments, narrowing the
        // on-map parcels by their `bldg_flats`. Segmented control styled to match
        // room's control cards (red accent for the active segment, same surface).
        const renderResidentialTypeCard = (fullWidth: boolean) => (
          <div className={`${cardSurface} rounded-lg p-4 ${fullWidth ? 'w-full' : 'min-w-[240px]'} transition-colors`} data-tour="residential-type">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('panel.restype.title')}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg p-0.5 bg-gray-100 dark:bg-gray-700/60">
              {RESIDENTIAL_TYPE_FILTERS.map((rt) => {
                const active = residentialTypeFilter === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => handleResidentialTypeChange(rt)}
                    aria-pressed={active}
                    className={`w-full px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
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
               same constant is hardcoded for the Claire launcher in src/index.css.
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

          <div className="flex items-stretch border-b border-gray-200 dark:border-gray-800/60 flex-shrink-0 px-3 py-2 gap-2">
            {/* Tour anchor for the "charts" step: the tab switcher that opens the
                Zone distribution charts (the chart content itself mounts only on
                its tab, so it can't carry a reliable anchor). Keep ONE value per
                data-tour — the panel root carries "zone-info-panel". */}
            <div className="flex-1" data-tour="zone-charts">
              <SegmentedTabs<'zone' | 'facts'>
                tabs={[
                  { id: 'zone', label: t('panel.tabs.zone_distribution') },
                  { id: 'facts', label: t('panel.tabs.parcel_facts') },
                ]}
                value={panelTab}
                onChange={setPanelTab}
                ariaLabel={t('panel.tabs.zone_distribution')}
                dark={isDarkMode}
                size="sm"
                activeTone="accent"
              />
            </div>
            {(parcelData || selectedParcel) && (
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                aria-pressed={showRaw}
                title={t('panel.info.toggle_raw_json')}
                aria-label={t('panel.info.toggle_raw_json')}
                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  showRaw
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <Braces size={16} />
              </button>
            )}
            <CloseButton
              onClick={handleCloseInfoPanel}
              label={t('panel.info.close')}
            />
          </div>

          {/* Scrollable tab content — flex-1 so the Save CTA footer stays pinned.
              When the raw-JSON developer view is on, it replaces the tab body
              with a dump of the clicked parcel's richest structured data (the
              RES parcelData response) plus the raw tile feature properties. */}
          {showRaw ? (
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
              />
            </Suspense>
          ) : (
            <ZoneInfoPanel
              parcelData={parcelData}
              isLoading={parcelDataLoading}
              error={parcelDataError}
              focusedParcel={focusedHandle}
              geometry={selectedParcel.geometry}
              queryNearbyParcels={queryParcelsAround}
              onJumpTo={handleFlyToParcel}
              darkMode={isDarkMode}
            />
          )}

          {/* Prominent, always-visible Save-to-PRM call to action. On phones it
              also carries the in-context "Ask Claire" CTA (the floating launcher
              is hidden there) in the suite-standard split footer row beside a
              compact cross-app "Open in" drop-up; on desktop the launcher is the
              single Claire entry point, so onAskClaire is undefined and the row
              is the full-width "Open in" menu alone. Both Claire paths open the
              same controlled assistant. */}
          <SaveToPrmBar
            focusedParcel={focusedHandle}
            parcelData={parcelData}
            darkMode={isDarkMode}
            onAskClaire={isMobile ? () => setClaireOpen(true) : undefined}
          />
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
