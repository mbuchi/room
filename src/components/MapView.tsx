import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import {
  MAPBOX_TOKEN,
  basemapOptions,
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
import { fetchParcelData, ParcelDataError, type ParcelData } from '../services/parcelDataService';
import { prefetchZoneStats, type ZoneStatsResponse } from '../services/zoneStatsService';
import DensityLegend from './DensityLegend';
import type { ScreenshotMetadata } from '../services/imageService';
import Navbar from './Navbar';
import MapControls from './MapControls';
import ZoomControl from './ZoomControl';
import CoordinateDisplay from './CoordinateDisplay';
import ZoneInfoPanel from './ZoneInfoPanel';
import ZonePanel from './ZonePanel';
import SaveToPrmBar from './SaveToPrmBar';
import { ClaireAssistant, loadMapboxStyleForMapLibre } from '@aireon/shared';
import { type LocateErrorCode } from './LocateButton';
import Toast from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface SelectedParcel {
  parcelId: string;
  egrid: string | null;
  props: Record<string, unknown>;
  lng: number;
  lat: number;
}

// Combined panel width — ZoneInfoPanel + ZonePanel stack vertically inside
// a single right-side column. Tuned to fit the 2-column histogram grid
// comfortably without dominating the map. The controls offset themselves by
// PANEL_OFFSET_PX whenever a parcel is selected so the panel never covers
// the layer/zoom buttons on md+ screens.
const PANEL_WIDTH_PX = 460;
const PANEL_OFFSET_PX = PANEL_WIDTH_PX + 16;

const MapView = () => {
  const { t, locale } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedBasemap, setSelectedBasemap] = useState('dark');
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false);
  const [parcelOpacity, setParcelOpacity] = useState(0.6);
  const [buildingOpacity, setBuildingOpacity] = useState(0.85);
  const [is3DMode, setIs3DMode] = useState(false);
  const [lv95Coords, setLv95Coords] = useState<[number, number] | null>(null);

  const [selectedParcel, setSelectedParcel] = useState<SelectedParcel | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [parcelDataLoading, setParcelDataLoading] = useState(false);
  const [parcelDataError, setParcelDataError] = useState<string | null>(null);
  // Which tab is visible in the right-side info pane. Charts ('zone') are
  // the default since they're the main thing users come to room for; the
  // 'facts' tab is the per-parcel reference. Resets to 'zone' on each
  // new parcel selection so the user always lands on the headline view.
  const [panelTab, setPanelTab] = useState<'zone' | 'facts'>('zone');
  // Mobile only: the right pane becomes a bottom sheet with a peek height and
  // an expanded height, toggled by the grab handle. Ignored at md+ where the
  // pane is a full-height right rail.
  const [sheetExpanded, setSheetExpanded] = useState(false);
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
  const activeZoneRef = useRef<ActiveZone | null>(null);
  activeZoneRef.current = activeZone;

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

  const selectParcelFromProps = useCallback((
    props: Record<string, unknown>,
    lng: number,
    lat: number,
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

    setSelectedParcel({ parcelId, egrid, props, lng, lat });
    setParcelData(null);
    setParcelDataError(null);
    setParcelDataLoading(true);
    setPanelTab('zone');

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

  const handleLocationSelect = useCallback((center: [number, number], _placeName: string) => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({ center, zoom: 17, duration: 2000 });

    map.once('idle', () => {
      const point = map.project(center);
      const features = map.queryRenderedFeatures(point, { layers: ['parcel-fill'] });

      if (features.length && features[0].properties) {
        selectParcelRef.current(features[0].properties, center[0], center[1]);
      }
    });
  }, []);

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

  const handleBasemapChange = useCallback((basemapId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const basemap = basemapOptions.find((b) => b.id === basemapId);
    if (!basemap) return;

    setSelectedBasemap(basemapId);
    setIsBasemapMenuOpen(false);

    const was3D = is3DMode;
    // MapLibre can't consume `mapbox://` styles directly, so resolve the Mapbox
    // style document (mapbox:// → https + token) before swapping it in.
    void loadMapboxStyleForMapLibre(basemap.style, { token: MAPBOX_TOKEN })
      .then((style) => {
        if (mapRef.current !== map) return;
        map.once('style.load', () => {
          if (mapRef.current !== map) return;
          addParcelLayers(map, parcelOpacity, activeZoneRef.current);
          addBuildingLayers(map, buildingOpacity);
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
          if (was3D) {
            if (map.getLayer('building-fill'))
              map.setLayoutProperty('building-fill', 'visibility', 'none');
            if (map.getLayer('building-outline'))
              map.setLayoutProperty('building-outline', 'visibility', 'none');
            addBuildingExtrusion(map, buildingOpacity);
          }
        });
        map.setStyle(style as unknown as StyleSpecification);
      })
      .catch((error) => {
        console.error(`Unable to load basemap "${basemap.id}" for MapLibre`, error);
      });
  }, [is3DMode, parcelOpacity, buildingOpacity]);

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

  const handleCloseInfoPanel = useCallback(() => {
    setSelectedParcel(null);
    setParcelData(null);
    setParcelDataError(null);
    setParcelDataLoading(false);
    if (mapRef.current?.getLayer('parcel-selected'))
      mapRef.current.setFilter('parcel-selected', ['==', ['get', 'parcel_id'], '']);
    if (mapRef.current?.getLayer('parcel-selected-casing'))
      mapRef.current.setFilter('parcel-selected-casing', ['==', ['get', 'parcel_id'], '']);
    handleZoneStatsCleared();
  }, [handleZoneStatsCleared]);

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

    // MapLibre needs a resolved style object (mapbox:// → https + token), so
    // fetch the Mapbox style first, then create the map. Dark is room's default
    // opening basemap.
    void loadMapboxStyleForMapLibre('mapbox://styles/mapbox/dark-v11', { token: MAPBOX_TOKEN })
      .then((style) => {
        if (cancelled || mapRef.current) return;

        const map = new maplibregl.Map({
          container,
          style: style as unknown as StyleSpecification,
          center: initialState.center,
          zoom: initialState.hasUrlCoords ? Math.max(initialState.zoom, 17) : initialState.zoom,
        });

        mapRef.current = map;

        map.on('load', () => {
          addParcelLayers(map, 0.6);
          addBuildingLayers(map, 0.85);
          const c = map.getCenter();
          updateUrlParams(c.lat, c.lng, map.getZoom());

          if (initialState.hasUrlCoords) {
            map.once('idle', () => {
              const point = map.project(initialState.center);
              const features = map.queryRenderedFeatures(point, { layers: ['parcel-fill'] });
              if (features.length && features[0].properties) {
                selectParcelRef.current(
                  features[0].properties,
                  initialState.center[0],
                  initialState.center[1],
                );
              }
            });
          }
        });

        map.on('mousemove', (e) => {
          const { lng, lat } = e.lngLat;
          setLv95Coords(wgs84ToLv95(lng, lat));
        });

        map.on('mouseout', () => {
          setLv95Coords(null);
        });

        map.on('click', 'parcel-fill', (e) => {
          // Mirror the hover gate: parcels are only selectable once zoomed to block
          // level. Below that the map is an overview — clicks would land on the
          // wrong tiny parcel — so we ignore them. Address-search and ?lat/?lng
          // deep-links fly to z17 first, so those selection paths stay unaffected.
          if (!isParcelInteractive(map.getZoom())) return;
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          if (!props) return;
          selectParcelRef.current(props, e.lngLat.lng, e.lngLat.lat);
        });

        map.on('moveend', () => {
          const c = map.getCenter();
          updateUrlParams(c.lat, c.lng, map.getZoom());
        });
      })
      .catch((error) => {
        console.error('Unable to initialise the MapLibre map', error);
      });

    return () => {
      cancelled = true;
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
      />
      <div ref={mapContainerRef} className="absolute inset-0 top-14" data-tour="map-view" />
      <MapControls
        selectedBasemap={selectedBasemap}
        isBasemapMenuOpen={isBasemapMenuOpen}
        onToggleBasemapMenu={() => setIsBasemapMenuOpen(!isBasemapMenuOpen)}
        onBasemapChange={handleBasemapChange}
        parcelOpacity={parcelOpacity}
        onParcelOpacityChange={handleParcelOpacityChange}
        buildingOpacity={buildingOpacity}
        onBuildingOpacityChange={handleBuildingOpacityChange}
        is3DMode={is3DMode}
        onToggle3D={handleToggle3D}
        panelOpen={!!selectedParcel}
        rightOffsetPx={selectedParcel ? PANEL_OFFSET_PX : null}
      />
      <ZoomControl
        getMap={() => mapRef.current}
        isDarkMode={true}
        align="left"
        className={`bottom-24 md:bottom-8 ${selectedParcel ? 'hidden md:block' : ''}`}
      />
      {selectedParcel && (
        <div
          className="z-30 flex flex-col bg-gray-950/95 backdrop-blur-xl shadow-2xl
            fixed inset-x-0 bottom-0 h-[var(--sheet-h)] max-h-[90vh] rounded-t-2xl border-t border-gray-800/60 animate-slide-up
            md:absolute md:top-14 md:right-0 md:bottom-0 md:inset-x-auto md:h-auto md:max-h-none md:rounded-none md:border-t-0 md:border-l md:w-[var(--panel-w)] md:animate-slide-in-right"
          style={
            {
              '--sheet-h': sheetExpanded ? '90vh' : '56vh',
              '--panel-w': `${PANEL_WIDTH_PX}px`,
            } as CSSProperties & Record<string, string>
          }
        >
          {/* Mobile grab handle — drag/tap to peek ↔ expand. Hidden at md+. */}
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            aria-label={sheetExpanded ? t('panel.sheet.collapse') : t('panel.sheet.expand')}
            className="md:hidden flex-shrink-0 w-full flex items-center justify-center pt-2.5 pb-1.5 group"
          >
            <span className="h-1.5 w-10 rounded-full bg-gray-700 group-hover:bg-gray-600 group-active:bg-gray-500 transition-colors" />
          </button>

          <div className="flex items-stretch border-b border-gray-800/60 flex-shrink-0">
            <button
              data-tour="zone-charts"
              onClick={() => setPanelTab('zone')}
              className={`flex-1 px-3 py-3 text-[13px] md:text-xs font-medium tracking-tight transition-colors border-b-2 ${
                panelTab === 'zone'
                  ? 'text-gray-100 border-red-500/80'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
            >
              {t('panel.tabs.zone_distribution')}
            </button>
            <button
              data-tour="zone-info-panel"
              onClick={() => setPanelTab('facts')}
              className={`flex-1 px-3 py-3 text-[13px] md:text-xs font-medium tracking-tight transition-colors border-b-2 ${
                panelTab === 'facts'
                  ? 'text-gray-100 border-red-500/80'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
            >
              {t('panel.tabs.parcel_facts')}
            </button>
            <button
              onClick={handleCloseInfoPanel}
              title={t('panel.info.close')}
              aria-label={t('panel.info.close')}
              className="px-3.5 md:px-3 text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition-colors border-l border-gray-800/60"
            >
              <X size={18} className="md:hidden" />
              <X size={16} className="hidden md:block" />
            </button>
          </div>

          {/* Scrollable tab content — flex-1 so the Save CTA footer stays pinned. */}
          {panelTab === 'zone' ? (
            <ZonePanel
              parcelData={parcelData}
              onZoneStatsLoaded={handleZoneStatsLoaded}
              onZoneStatsCleared={handleZoneStatsCleared}
            />
          ) : (
            <ZoneInfoPanel
              parcelData={parcelData}
              isLoading={parcelDataLoading}
              error={parcelDataError}
              focusedParcel={focusedHandle}
            />
          )}

          {/* Prominent, always-visible Save-to-PRM call to action. */}
          <SaveToPrmBar focusedParcel={focusedHandle} parcelData={parcelData} />
        </div>
      )}
      {selectedParcel && (
        <ClaireAssistant
          appName="room"
          geminiApiKey={import.meta.env.VITE_GEMINI_API_KEY as string | undefined}
          voiceCallEnabled
          darkMode={true}
          properties={selectedParcel.props}
          lngLat={{ lng: selectedParcel.lng, lat: selectedParcel.lat }}
          headerAddress={
            typeof selectedParcel.props.address === 'string'
              ? selectedParcel.props.address
              : undefined
          }
        />
      )}
      {selectedParcel && activeZone && (
        <DensityLegend
          zone={activeZone}
          selectedRatioV={parcelData?.ratio_v ?? null}
          rightOffsetPx={PANEL_OFFSET_PX}
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
