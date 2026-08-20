import { DEFAULT_MAP_ZOOM } from '@aireon/shared/map-defaults';
import {
  getInitialMapState as sharedInitialMapState,
  getParcelParams,
  updateConfirmedLocationUrl,
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

/**
 * Stamp a confirmed parcel selection into the address bar.
 *
 * Selecting a parcel is a location CONFIRMATION and owes the URL the same
 * identity the navbar address search and the right-click "load location" menu
 * already write (URL_PARAMS_STANDARD.md, "Address precedence"). Without it a
 * left-click left the address bar on whatever the camera last wrote: the URL
 * could not be copied to point a colleague at the parcel on screen, AND the
 * navbar's "Share this view" button, which copies `window.location.href`
 * verbatim, shared a bare camera position with the parcel dropped.
 *
 * The camera writer is not a substitute. `updateUrlParams` only runs on
 * `moveend`, and a click does not move the map, so it never fired for a
 * selection.
 *
 * room's vector tiles carry the federal EGRID in the `parcel_id` FEATURE
 * property (there is no `egrid` field on the tile), so that value is written as
 * `?egrid=` here, the spelling the shared reader and the rest of the suite
 * speak. `?lat`/`?lng` always ride along: the deep-link auto-select only runs
 * when the URL has coordinates, so an egrid-only link would restore nothing.
 */
export function stampConfirmedParcelUrl(opts: {
  lat: number;
  lng: number;
  /** Map zoom at selection time, read before any camera animation starts. */
  zoom?: number;
  /** The parcel's OWN tile address, never a coordinate reverse geocode. */
  label: string | null;
  /** The parcel's federal EGRID, when the tile feature carries one. */
  egrid: string | null;
}): void {
  updateConfirmedLocationUrl({
    lat: opts.lat,
    lng: opts.lng,
    zoom: opts.zoom,
    query: opts.label,
    egrid: opts.egrid,
  });
}

/**
 * Undo {@link stampConfirmedParcelUrl} when the parcel panel closes.
 *
 * Without this the URL keeps naming a parcel that is no longer on screen: a
 * reload re-opens a panel the user just dismissed, and "Share this view" keeps
 * sharing the dismissed parcel. The camera position stays, because that is
 * still what the user is looking at; only the identity the selection
 * contributed is dropped.
 */
export function clearConfirmedParcelUrl(opts: {
  lat: number;
  lng: number;
  zoom?: number;
}): void {
  updateConfirmedLocationUrl({
    lat: opts.lat,
    lng: opts.lng,
    zoom: opts.zoom,
    query: null,
    egrid: null,
    parcelId: null,
  });
}

/**
 * The parcel id an inbound deep link named, or null.
 *
 * Read back so the `?egrid=` this app now writes actually means something: when
 * several parcel polygons stack under the link's point (shared borders, a
 * courtyard drawn over a plot), the id says which one the sender had open
 * instead of leaving it to whichever feature MapLibre returns first. The
 * `?parcel_id=` spelling is accepted as well, since other suite surfaces emit
 * it.
 *
 * The shared parser caches the query string on first read, so this always
 * reports the URL the page was OPENED with, never a later self-write.
 */
export function getDeepLinkParcelId(): string | null {
  const { egrid, parcelId } = getParcelParams();
  return egrid ?? parcelId ?? null;
}
