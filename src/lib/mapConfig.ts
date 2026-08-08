import { DEFAULT_MAP_ZOOM } from '@aireon/shared/map-defaults';
import {
  getInitialMapState as sharedInitialMapState,
  updateMapUrl,
  type AireonInitialMapState,
} from '@aireon/shared/url-params';

export const DEFAULT_CENTER: [number, number] = [8.894175, 47.556806];
export const DEFAULT_ZOOM = DEFAULT_MAP_ZOOM;

export const buildingVolumeLegend = [
  { color: '#deebf7', label: '0 - 100' },
  { color: '#c6dbef', label: '100 - 250' },
  { color: '#9ecae1', label: '250 - 500' },
  { color: '#6baed6', label: '500 - 1000' },
  { color: '#4292c6', label: '1000 - 2500' },
  { color: '#2171b5', label: '2500 - 5000' },
  { color: '#08519c', label: '5000 - 10000' },
  { color: '#08306b', label: '> 10000' },
];

export const BUILDING_VOLUME_COLORS: [number, string][] = [
  [0, '#deebf7'],
  [100, '#c6dbef'],
  [250, '#9ecae1'],
  [500, '#6baed6'],
  [1000, '#4292c6'],
  [2500, '#2171b5'],
  [5000, '#08519c'],
  [10000, '#08306b'],
];

export const PARCEL_RATIO_COLORS: [number, string][] = [
  [0, '#d73027'],
  [12.5, '#f46d43'],
  [25, '#fdae61'],
  [37.5, '#fee08b'],
  [50, '#d9ef8b'],
  [62.5, '#a6d96a'],
  [75, '#66bd63'],
  [87.5, '#1a9850'],
];

export type InitialMapState = AireonInitialMapState;

// Thin shim over @aireon/shared/url-params (URL_PARAMS_STANDARD.md). Keeps
// the local filename + these exact exported names so every call site keeps
// compiling untouched, while gaining deepLinkZoom/pitch/bearing/view for
// free — callers that only destructure center/zoom/hasUrlCoords are
// unaffected by the extra fields.
export function getInitialMapState(): InitialMapState {
  return sharedInitialMapState({ defaultCenter: DEFAULT_CENTER, defaultZoom: DEFAULT_ZOOM });
}

export function updateUrlParams(lat: number, lng: number, zoom: number): void {
  updateMapUrl({ lat, lng, zoom });
}
