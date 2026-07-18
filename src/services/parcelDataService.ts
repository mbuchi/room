/**
 * Typed wrapper around `POST /res_api/parcel_data` on the RES backend.
 *
 * The RES endpoint returns a GeoJSON feature whose `properties` object holds
 * every field room consumes — parcel facts (area, municipality, zoning), the
 * existing building roll-up (volume, year, footprint), and the six new
 * utilisation ratios that drive room's percentile/distribution charts
 * (`ratio_v`, `free_v`, `ratio_s`, `gfz`, `bldg_height_m`, `bldg_floors_n`).
 *
 * We deliberately type only the subset of fields that room actually reads —
 * the upstream payload has many more keys, but extending this type as the UI
 * grows is cheap and the surface stays scoped to what's used.
 *
 * Caching matches the zoneStatsService strategy (which itself follows scoore's
 * overpass cache): an in-memory Map fronts an `IndexedDBCache` so the FIRST
 * click on a previously-seen parcel after a reload is instant.
 *   - Key: `egrid` when present (canonical federal id), else a quantised
 *     `${lat.toFixed(5)}_${lng.toFixed(5)}` (~1 m precision — close enough to
 *     collapse repeated clicks at the same point without bleeding across
 *     neighbouring parcels).
 *   - 50 MB LRU budget, no TTL — parcel facts change at most monthly.
 */
import { IndexedDBCache } from '../utils/cache';
import { fullParcelAddress } from '../lib/parcelAddress';

// Calls go through the Vercel Edge proxy in `api/parcel-data.ts`, which
// injects the RES_API_TOKEN server-side so it never reaches the browser.
// In dev, the relative URL hits whatever `vercel dev` or the Vite proxy
// resolves; in prod it hits room's own /api/parcel-data Edge function.
const PARCEL_DATA_URL = '/api/parcel-data';

const PERSISTENT_CACHE_MAX_BYTES = 50 * 1024 * 1024;

const memoryCache = new Map<string, ParcelData>();
const persistentCache = new IndexedDBCache<ParcelData>(
  'room-cache',
  'parcel-data',
  // List all sibling stores so whichever service opens the DB first creates
  // the complete schema (see cache.ts → IndexedDBCacheOptions.stores).
  { maxBytes: PERSISTENT_CACHE_MAX_BYTES, stores: ['parcel-data', 'zone-stats', 'city-market'] },
);

function cacheKey(req: ParcelDataRequest): string {
  // Prefer the stable federal id; fall back to quantised coordinates so a
  // click that doesn't yet know the egrid still hits the same row on a
  // re-click. 5 dp ≈ 1 m which is well inside parcel resolution.
  if (req.egrid) return `egrid:${req.egrid}`;
  return `ll:${req.lat.toFixed(5)}_${req.lng.toFixed(5)}`;
}

/** Wipe both cache layers — used by debug actions / explicit invalidation. */
export function clearParcelDataCache(): void {
  memoryCache.clear();
  void persistentCache.clear();
}

export interface ParcelData {
  /** BFS commune number — joins parcel to municipality/zone aggregates. */
  fso: number | null;
  /** Human-readable municipality name (lang-dependent on the server). */
  municipality_name: string | null;
  /** Local zoning category (e.g. "W3", "K3-OS"). Used as the zone key. */
  cz_local: string | null;
  /** Canton-level zoning category, the harmonised reading of cz_local. */
  cz_canton: string | null;
  /** Allowed utilisation (volume m³) for cz_local at this parcel area. */
  cz_util_now: number | null;
  /** Parcel surface area in m². */
  parcel_area: number | null;
  /** Existing built volume (m³), summed across all buildings on the parcel. */
  built_volume: number | null;
  /** Year of the oldest existing building on the parcel. */
  bldg_constr_year: number | null;
  /** built_volume / cz_util_est — 1.0 means the zone allowance is fully used. */
  ratio_v: number | null;
  /** (cz_util_est − built_volume) in m³ — negative when over-built. */
  free_v: number | null;
  /** built_footprint_area / parcel_area — site coverage. */
  ratio_s: number | null;
  /** total floor area / parcel area — GFZ (Geschossflächenziffer). */
  gfz: number | null;
  /** Tallest building on the parcel, metres. */
  bldg_height_m: number | null;
  /** Max number of floors among the parcel's buildings. */
  bldg_floors_n: number | null;

  /** Street address if RES could resolve one. Used for the ZoneInfoPanel header. */
  address?: string | null;
  /** The same address with zip + city joined back on ("Nüschelerstrasse 46 8001
   *  Zürich") — what the navbar search box shows after a map click, so it reads
   *  identically to a search-dropdown pick. Null when the parcel has no address. */
  address_full?: string | null;
  /** Selected parcel id (`<canton><parcel_no>` style) — for cross-app links. */
  parcel_id?: string | null;
  /** Federal parcel identifier. */
  egrid?: string | null;
}

export interface ParcelDataRequest {
  lat: number;
  lng: number;
  egrid?: string | null;
  /** RES expects a `structure` discriminator; room always wants the default shape. */
  structure?: 'default';
}

export class ParcelDataError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ParcelDataError';
  }
}

/**
 * Fetch parcel facts (and the six utilisation ratios) for a single parcel.
 * Throws `ParcelDataError` on network / non-2xx so callers can surface a
 * clear message in the panel.
 */
export async function fetchParcelData(req: ParcelDataRequest): Promise<ParcelData> {
  const key = cacheKey(req);

  // Layer 1 — synchronous in-memory hit. Either populated by an earlier
  // network call this session, or hydrated from IndexedDB below.
  const memHit = memoryCache.get(key);
  if (memHit) return memHit;

  // Layer 2 — persistent IndexedDB hit. A few-ms read vs. a multi-second
  // round-trip on a cold reload.
  const idbHit = await persistentCache.get(key);
  if (idbHit) {
    memoryCache.set(key, idbHit);
    return idbHit;
  }

  let res: Response;
  try {
    res = await fetch(PARCEL_DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: req.lat,
        lng: req.lng,
        egrid: req.egrid ?? null,
        structure: req.structure ?? 'default',
      }),
    });
  } catch (err) {
    throw new ParcelDataError(
      err instanceof Error ? err.message : 'Network error contacting RES',
    );
  }

  if (!res.ok) {
    throw new ParcelDataError(
      `RES /parcel_data returned ${res.status}`,
      res.status,
    );
  }

  // RES returns a GeoJSON Feature; the interesting bits live on .properties.
  const body: unknown = await res.json();
  const props = extractProperties(body);
  const data = normalize(props);

  // Write through to both cache layers. If the response carries an `egrid`
  // and the caller didn't already supply one, also index under the egrid key
  // — that's the stable identifier callers will use on re-click.
  memoryCache.set(key, data);
  void persistentCache.set(key, data);
  if (!req.egrid && data.egrid) {
    const egridKey = `egrid:${data.egrid}`;
    memoryCache.set(egridKey, data);
    void persistentCache.set(egridKey, data);
  }
  return data;
}

function extractProperties(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const b = body as Record<string, unknown>;
  // Most RES endpoints return either a Feature or a bare properties object.
  if (b.properties && typeof b.properties === 'object') {
    return b.properties as Record<string, unknown>;
  }
  if (Array.isArray(b.features) && b.features.length) {
    const f = b.features[0] as Record<string, unknown> | undefined;
    if (f && typeof f === 'object' && f.properties && typeof f.properties === 'object') {
      return f.properties as Record<string, unknown>;
    }
  }
  return b;
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalize(props: Record<string, unknown>): ParcelData {
  // RES's canonical field name is `fso_num` (with `fso_num_2021` as an
  // alias for the latest census year). The room schema models it as `fso`
  // for readability, so we accept all three on the wire. Without this
  // alias the zone-stats fetch never fires — ZonePanel guards on a
  // numeric `fso`.
  return {
    fso: numberOrNull(props.fso ?? props.fso_num ?? props.fso_num_2021),
    municipality_name:
      stringOrNull(props.municipality_name) ?? stringOrNull(props.fso_name_2021),
    cz_local: stringOrNull(props.cz_local),
    cz_canton: stringOrNull(props.cz_canton),
    cz_util_now: numberOrNull(props.cz_util_now ?? props.cz_util_est),
    parcel_area: numberOrNull(props.parcel_area),
    built_volume: numberOrNull(props.built_volume),
    bldg_constr_year: numberOrNull(props.bldg_constr_year),
    ratio_v: numberOrNull(props.ratio_v),
    free_v: numberOrNull(props.free_v),
    ratio_s: numberOrNull(props.ratio_s),
    gfz: numberOrNull(props.gfz),
    bldg_height_m: numberOrNull(props.bldg_height_m),
    bldg_floors_n: numberOrNull(props.bldg_floors_n),
    address: stringOrNull(props.address),
    // RES serves parcel_2025_07 straight off the same table the tiles are built
    // from, so `zip` (a Number) and `cityname` ride along with `address` here.
    address_full: fullParcelAddress(props),
    parcel_id: stringOrNull(props.parcel_id),
    egrid: stringOrNull(props.egrid ?? props.EGRID ?? props.egrid_str),
  };
}
