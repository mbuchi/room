import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import {
  MAPBOX_TOKEN,
  basemapOptions,
  getInitialMapState,
  updateUrlParams,
} from '../lib/mapConfig';
import { addParcelLayers, addBuildingLayers, addBuildingExtrusion } from '../lib/mapLayers';
import { wgs84ToLv95 } from '../lib/coordTransform';
import { fetchParcelData, ParcelDataError, type ParcelData } from '../services/parcelDataService';
import type { ZoneStatsResponse } from '../services/zoneStatsService';
import type { ScreenshotMetadata } from '../services/imageService';
import Navbar from './Navbar';
import MapControls from './MapControls';
import ZoomControl from './ZoomControl';
import CoordinateDisplay from './CoordinateDisplay';
import ZoneInfoPanel from './ZoneInfoPanel';
import ZonePanel from './ZonePanel';
import { ClaireAssistant } from '@swissnovo/shared';
import { requestGeolocation, type LocateErrorCode } from './LocateButton';
import Toast from './Toast';
import LocationPermissionModal from './LocationPermissionModal';
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
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
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const locateMarkerRef = useRef<mapboxgl.Marker | null>(null);
  /** Track which egrids currently have feature-state so we can wipe cleanly. */
  const paintedEgridsRef = useRef<Set<string>>(new Set());

  const selectedParcelRef = useRef<SelectedParcel | null>(null);
  selectedParcelRef.current = selectedParcel;
  const selectedBasemapRef = useRef(selectedBasemap);
  selectedBasemapRef.current = selectedBasemap;
  const is3DModeRef = useRef(is3DMode);
  is3DModeRef.current = is3DMode;
  const parcelOpacityRef = useRef(parcelOpacity);
  parcelOpacityRef.current = parcelOpacity;

  const selectParcelFromProps = useCallback((
    props: Record<string, unknown>,
    lng: number,
    lat: number,
  ) => {
    const map = mapRef.current;
    if (!map) return;

    const parcelId = (props.parcel_id as string) ?? '';
    const egrid: string | null = (props.egrid as string) ?? (props.EGRID as string) ?? null;

    if (map.getLayer('parcel-selected'))
      map.setFilter('parcel-selected', ['==', ['get', 'parcel_id'], parcelId]);

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
  }, [t]);

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
   * Push percentile feature-state for every parcel in the active zone, and
   * clear any leftover state from the previous zone so colour bleed doesn't
   * accumulate when the user switches zones in the dropdown.
   */
  const handleZoneStatsLoaded = useCallback(
    (parcels: ZoneStatsResponse['parcels'], percentileByEgrid: Map<string, number>) => {
      const map = mapRef.current;
      if (!map) return;

      // Wipe previous painted state first.
      for (const prevEgrid of paintedEgridsRef.current) {
        if (!percentileByEgrid.has(prevEgrid)) {
          map.removeFeatureState({
            source: 'parcel-tiles',
            sourceLayer: 'parcel_2025_07',
            id: prevEgrid,
          });
        }
      }

      const next = new Set<string>();
      for (const p of parcels) {
        if (!p.egrid) continue;
        const pct = percentileByEgrid.get(p.egrid) ?? 0;
        map.setFeatureState(
          {
            source: 'parcel-tiles',
            sourceLayer: 'parcel_2025_07',
            id: p.egrid,
          },
          { percentile: Math.max(0, Math.min(1, pct / 100)) },
        );
        next.add(p.egrid);
      }
      paintedEgridsRef.current = next;
    },
    [],
  );

  const handleZoneStatsCleared = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const egrid of paintedEgridsRef.current) {
      map.removeFeatureState({
        source: 'parcel-tiles',
        sourceLayer: 'parcel_2025_07',
        id: egrid,
      });
    }
    paintedEgridsRef.current = new Set();
  }, []);

  /**
   * Mapbox style expression for parcel fill-opacity that respects both the
   * current slider value AND whether the parcel has a percentile painted.
   * Re-applied any time the slider moves so the choropleth contrast is
   * preserved.
   */
  const buildFillOpacityExpression = (opacity: number): mapboxgl.ExpressionSpecification => [
    'case',
    ['==', ['feature-state', 'percentile'], null],
    opacity * 0.12,
    opacity * 0.55,
  ];

  const handleBasemapChange = useCallback((basemapId: string) => {
    if (!mapRef.current) return;
    const basemap = basemapOptions.find((b) => b.id === basemapId);
    if (!basemap) return;

    setSelectedBasemap(basemapId);
    setIsBasemapMenuOpen(false);

    const was3D = is3DMode;
    mapRef.current.setStyle(basemap.style);

    mapRef.current.once('style.load', () => {
      if (!mapRef.current) return;
      addParcelLayers(mapRef.current, parcelOpacity);
      addBuildingLayers(mapRef.current, buildingOpacity);
      if (was3D) {
        if (mapRef.current.getLayer('building-fill'))
          mapRef.current.setLayoutProperty('building-fill', 'visibility', 'none');
        if (mapRef.current.getLayer('building-outline'))
          mapRef.current.setLayoutProperty('building-outline', 'visibility', 'none');
        addBuildingExtrusion(mapRef.current, buildingOpacity);
      }
    });
  }, [is3DMode, parcelOpacity, buildingOpacity]);

  const handleParcelOpacityChange = useCallback((value: number) => {
    setParcelOpacity(value);
    if (mapRef.current) {
      if (mapRef.current.getLayer('parcel-outline'))
        mapRef.current.setPaintProperty('parcel-outline', 'line-opacity', value);
      if (mapRef.current.getLayer('parcel-fill'))
        mapRef.current.setPaintProperty(
          'parcel-fill',
          'fill-opacity',
          buildFillOpacityExpression(value),
        );
    }
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

    locateMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);

    map.flyTo({ center: coords, zoom: 15, duration: 2000 });

    setToast({ message: t('map.locate.moved'), type: 'success' });
  }, [t]);

  const handleLocateError = useCallback((code: LocateErrorCode) => {
    setToast({ message: t(`map.locate.${code}`), type: 'error' });
  }, [t]);

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionModal(false);
    requestGeolocation(handleLocate, handleLocateError);
  }, [handleLocate, handleLocateError]);

  const handlePermissionDismiss = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  const handleCloseInfoPanel = useCallback(() => {
    setSelectedParcel(null);
    setParcelData(null);
    setParcelDataError(null);
    setParcelDataLoading(false);
    if (mapRef.current?.getLayer('parcel-selected'))
      mapRef.current.setFilter('parcel-selected', ['==', ['get', 'parcel_id'], '']);
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

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialState = getInitialMapState();

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
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
      if (!e.features?.length) return;
      const props = e.features[0].properties;
      if (!props) return;
      selectParcelRef.current(props, e.lngLat.lng, e.lngLat.lat);
    });

    map.on('moveend', () => {
      const c = map.getCenter();
      updateUrlParams(c.lat, c.lng, map.getZoom());
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Keep ZoneInfoPanel's address aware of the I18n locale by re-rendering
  // when locale changes — the parcel-data fetch itself isn't re-issued.
  void locale;

  return (
    <div className="relative w-full h-screen">
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
        className="bottom-24 transition-[right] duration-300 md:bottom-8"
        rightOffsetPx={selectedParcel ? PANEL_OFFSET_PX : null}
      />
      {selectedParcel && (
        <div
          className="absolute top-14 right-0 bottom-0 z-30 flex flex-col animate-slide-in-right bg-gray-950/95 backdrop-blur-xl border-l border-gray-800/60 shadow-2xl"
          style={{ width: `${PANEL_WIDTH_PX}px` }}
        >
          <div className="flex items-stretch border-b border-gray-800/60 flex-shrink-0">
            <button
              data-tour="zone-charts"
              onClick={() => setPanelTab('zone')}
              className={`flex-1 px-3 py-3 text-xs font-medium tracking-tight transition-colors border-b-2 ${
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
              className={`flex-1 px-3 py-3 text-xs font-medium tracking-tight transition-colors border-b-2 ${
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
              className="px-3 text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition-colors border-l border-gray-800/60"
            >
              <X size={16} />
            </button>
          </div>
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
            />
          )}
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
      <CoordinateDisplay coords={lv95Coords} />
      {showPermissionModal && (
        <LocationPermissionModal
          onAllow={handlePermissionAllow}
          onDismiss={handlePermissionDismiss}
        />
      )}
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
