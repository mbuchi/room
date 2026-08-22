import { DEFAULT_MAP_ZOOM } from '@aireon/shared/map-defaults';
import {
  getInitialMapState as sharedInitialMapState,
  getParcelAutoSelect,
  getPanelTopicOverride,
  updateConfirmedLocationUrl,
  updateMapUrl,
  type AireonInitialMapState,
  type AireonParcelAutoSelect,
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

/** Federal EGRID shape: "CH" followed by digits, e.g. CH188031547755. */
const EGRID_PATTERN = /^CH\d+$/i;

/**
 * Extract canonical egrid and parcelId from parcel tile properties and feature ID.
 */
export function parcelUrlIdentity(
  properties: Record<string, unknown> | null | undefined,
  featureId?: string | number | null,
): { egrid: string | null; parcelId: string | null } {
  const read = (key: string): string | null => {
    const value = properties?.[key];
    if (value === undefined || value === null || value === '') return null;
    return String(value);
  };
  const explicitEgrid = read('egrid');
  const rawParcelId = read('parcel_id') ?? (featureId != null ? String(featureId) : null);
  const egrid =
    explicitEgrid ?? (rawParcelId && EGRID_PATTERN.test(rawParcelId) ? rawParcelId : null);
  return { egrid, parcelId: rawParcelId && rawParcelId !== egrid ? rawParcelId : null };
}

/**
 * Stamp a confirmed parcel selection into the address bar.
 *
 * Since shared v1.185.0 this also writes `?select=parcel`: the writer infers
 * the value from the call, and this one always names an identity (and usually
 * a label), so the copied link states that a parcel is open. Its twin below is
 * the `off` half of the same rule.
 */
export function stampConfirmedParcelUrl(opts: {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string | null;
  egrid?: string | null;
  parcelId?: string | null;
}): void {
  updateConfirmedLocationUrl({
    lat: opts.lat,
    lng: opts.lng,
    zoom: opts.zoom,
    query: opts.label ?? null,
    egrid: opts.egrid ?? null,
    parcelId: opts.parcelId ?? null,
  });
}

/**
 * Undo parcel confirmation when the panel is closed.
 *
 * Nulling every identity is what makes shared v1.185.0 stamp `?select=off`,
 * which is the point: dropping `?q`/`?egrid` alone left the URL ambiguous
 * between "the visitor closed the panel" and "this link never named a parcel",
 * and `getParcelAutoSelect()` reads `select=off` as "owe the visitor nothing",
 * so reloading a dismissed panel keeps it dismissed. The camera stays.
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

export type ParcelAutoSelectTarget = AireonParcelAutoSelect;

/**
 * "Open with the parcel already selected" — the read-side twin of
 * `stampConfirmedParcelUrl` (URL_PARAMS_STANDARD.md, "Open with the parcel
 * selected").
 *
 * Thin pass-through so every URL read in room goes through this one shim, the
 * way `getInitialMapState` already does. The gate itself is deliberately NOT
 * re-derived here: `enabled` is true for an EXTERNAL `?lat`/`?lng`, true for a
 * reloaded self-written URL that still carries `?egrid`/`?parcel_id` (the panel
 * has to come back), and false under `?select=off` or for a self-written bare
 * coordinate. That last case is why this is not simply `hasUrlCoords`:
 * `updateUrlParams` rewrites `?lat`/`?lng` on every `moveend`, so a plain
 * reload must not conjure a panel the visitor never opened.
 *
 * Read it BEFORE the first `updateUrlParams` of the page load. The shared URL
 * state is parsed once and cached, so ordering only matters for the very first
 * reader, but keeping this call next to `getInitialMapState()` makes that
 * impossible to get wrong.
 *
 * `requireIdMatch` (shared v1.184.0+) rides along on the same result and is
 * true exactly for the self-written-and-names-a-parcel case above. It tells the
 * hit-test not to settle for whatever is topmost under the coordinates, because
 * on that reload the coordinates are wherever the camera last stopped, not the
 * parcel `?egrid` names. Thread it into `selectParcelWhenReady`.
 */
export function getParcelAutoSelectTarget(): ParcelAutoSelectTarget {
  return getParcelAutoSelect();
}

/**
 * Resolve `?topic=` to one of the panel's own tab ids.
 *
 * room owns its tab set (`zone · parcel · market · massing · faq · compare`),
 * so the URL value is validated against that list rather than against the
 * suite-wide topic vocabulary — an unknown id falls back to the app default
 * instead of opening a tab that does not exist (PANEL_TABS_STANDARD.md T9).
 *
 * `aliases` maps the canonical suite ids onto room's local spellings so an
 * "Open with" handoff from an app that speaks `build`/`details` still lands on
 * the right tab. A canonical id room has no equivalent for (`value`, `rent`)
 * simply falls through to the default.
 */
export function resolvePanelTopic<T extends string>(
  valid: readonly T[],
  fallback: T,
  aliases: Readonly<Record<string, T>> = {},
): T {
  const raw = getPanelTopicOverride()?.trim().toLowerCase();
  if (!raw) return fallback;
  const direct = valid.find((id) => id.toLowerCase() === raw);
  if (direct) return direct;
  const aliased = aliases[raw];
  return aliased && valid.includes(aliased) ? aliased : fallback;
}
