/**
 * Typed wrapper around `POST /res_api/zone_stats` — room's bespoke aggregate
 * endpoint that returns, for a given (FSO, CZ Local) zone:
 *   - the distribution + summary stats of every utilisation metric room
 *     plots (`ratio_v`, `free_v`, `ratio_s`, `gfz`, `bldg_height_m`,
 *     `bldg_floors_n`),
 *   - the seven age-cohort utilisation means (all years, then the last
 *     60 / 40 / 20 / 15 / 10 / 5 years),
 *   - an unfiltered `parcels[]` list (egrid + area + volume + year) which
 *     drives both the scatter plot AND the choropleth via setFeatureState,
 *   - the list of other zones available within the same municipality so the
 *     ZoneSelectorDropdown can switch context without re-fetching parcel data.
 *
 * Responses are cached in two layers, keyed by `v2:${fso}:${cz_local}` (see
 * `cacheKey` for why the key carries a payload-shape version):
 *
 *   1. An in-memory `Map` — sync, instant, populated for the lifetime of the
 *      tab. `getCachedZoneStats` reads only this layer so the panel can skip
 *      its skeleton on same-session re-clicks without awaiting anything.
 *   2. An `IndexedDBCache` backed by the shared `room-cache` database — async,
 *      survives reloads, never expires, capped at 50 MB with LRU eviction.
 *      Mirrors the cache strategy used by scoore for its overpass queries.
 *
 * `fetchZoneStats` checks the Map first, then IDB, then goes to the network;
 * a successful network response is written back to both layers so subsequent
 * same-session reads stay synchronous.
 *
 * The RES backend keeps its own LRU on the server side; the IDB layer is what
 * makes the FIRST load after a page reload feel instant — without it, every
 * fresh tab pays the round-trip again (and, for uncached server entries, the
 * ~45 s aggregate cost on top of that).
 */
import { IndexedDBCache } from '../utils/cache';

// Calls go through the Vercel Edge proxy in `api/zone-stats.ts`, which
// injects the RES_API_TOKEN server-side.
const ZONE_STATS_URL = '/api/zone-stats';

// 50 MB budget, no TTL: zone aggregates change at most monthly (driven by
// GWR refreshes), so persistent storage is safe. LRU eviction guarantees the
// store size stays bounded even after extended exploration.
const PERSISTENT_CACHE_MAX_BYTES = 50 * 1024 * 1024;

export interface ZoneSummary {
  min: number;
  max: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
  n: number;
}

export type ZoneMetric =
  | 'ratio_v'
  | 'free_v'
  | 'ratio_s'
  | 'gfz'
  | 'bldg_height_m'
  | 'bldg_floors_n';

export interface ZoneAgeCohort {
  /** English window label straight from RES ('All years', 'Last 20 years', …).
   *  Never rendered as an axis tick — the chart derives a compact, localized
   *  label from the cohort KEY instead. */
  cohort_label: string;
  /** `null` when the window holds no parcels. RES still ships the cohort
   *  (with `n: 0`), so a thin window is a gap in the line, not a missing key. */
  mean_ratio_v: number | null;
  n: number;
}

export interface ZoneParcel {
  egrid: string;
  area: number;
  volume: number;
  year: number | null;
}

export interface ZoneStatsResponse {
  zone: {
    fso: number;
    municipality_name: string;
    cz_local: string;
    cz_canton: string;
    parcel_count: number;
  };
  other_zones: Array<{ cz_local: string; parcel_count: number }>;
  distributions: Record<ZoneMetric, number[]>;
  summary: Record<ZoneMetric, ZoneSummary>;
  age_cohorts: {
    now: ZoneAgeCohort;
    last20: ZoneAgeCohort;
    last40: ZoneAgeCohort;
    last60: ZoneAgeCohort;
    // The three narrow windows arrived with the seven-step ladder (RES
    // /zone_stats, project_RES #326). They are OPTIONAL on purpose: a payload
    // restored from the browser HTTP cache or from a persistent client cache
    // written before that change carries only the four legacy cohorts, so a
    // required key would be a lie the compiler cannot catch at runtime.
    // Consumers must skip whichever keys the payload does not carry.
    last15?: ZoneAgeCohort;
    last10?: ZoneAgeCohort;
    last5?: ZoneAgeCohort;
  };
  parcels: ZoneParcel[];
}

export interface ZoneStatsRequest {
  fso: number;
  cz_local: string;
  lang?: 'de' | 'en' | 'fr' | 'it';
}

export class ZoneStatsError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ZoneStatsError';
  }
}

const memoryCache = new Map<string, ZoneStatsResponse>();
const persistentCache = new IndexedDBCache<ZoneStatsResponse>(
  'room-cache',
  'zone-stats',
  // List all sibling stores so whichever service opens the DB first creates
  // the complete schema — otherwise this store is silently never created.
  { maxBytes: PERSISTENT_CACHE_MAX_BYTES, stores: ['parcel-data', 'zone-stats', 'city-market'] },
);

/**
 * Cache key = payload-SHAPE version + zone identity.
 *
 * The `v2:` segment is what retires four-cohort payloads. Bumping DB_VERSION
 * would NOT: the IndexedDB store carries no TTL (`ttlMinutes` is omitted, so
 * entries never expire) and its `onupgradeneeded` pass only creates missing
 * stores without wiping data (see the comments in `src/utils/cache.ts`), so a
 * pre-ladder entry survives every version bump forever. Changing the key
 * instead makes the old entries simply unreachable — they age out through the
 * existing LRU eviction — while every `v2:` hit is guaranteed to be a payload
 * fetched after the seven-cohort rollout.
 *
 * Renaming the object store would work too, but the store name is listed in
 * the `stores: [...]` array of three services and getting one of them wrong
 * silently kills that cache; the key is the smaller, safer lever.
 */
function cacheKey(req: ZoneStatsRequest): string {
  return `v2:${req.fso}:${req.cz_local}`;
}

/**
 * Synchronous cache probe — only inspects the in-memory layer.
 *
 * Returning a promise here would force every caller to render a loading
 * skeleton, which defeats the purpose of having a same-session fast path.
 * For cross-session hits, callers should fall through to `fetchZoneStats`,
 * which awaits the IndexedDB read internally.
 */
export function getCachedZoneStats(
  req: ZoneStatsRequest,
): ZoneStatsResponse | undefined {
  return memoryCache.get(cacheKey(req));
}

/** Wipe both cache layers — used by the "Re-process" / debug actions. */
export function clearZoneStatsCache(): void {
  memoryCache.clear();
  // Fire-and-forget; an IDB clear failure must not propagate to the UI.
  void persistentCache.clear();
}

/**
 * Fetch zone aggregates. Returns the cached payload synchronously if we've
 * already seen this (fso, cz_local) in the session.
 *
 * Errors are surfaced as `ZoneStatsError` with a clear message — the
 * endpoint is brand-new and may not yet be deployed when room ships to
 * preview, so we DO NOT silently fall back to empty data. The panel
 * shows the failure instead.
 */
export async function fetchZoneStats(
  req: ZoneStatsRequest,
): Promise<ZoneStatsResponse> {
  const key = cacheKey(req);

  // Layer 1 — synchronous in-memory hit. Populated either by a previous
  // network call or by the IndexedDB hydration just below.
  const memHit = memoryCache.get(key);
  if (memHit) return memHit;

  // Layer 2 — persistent IndexedDB hit. The await is sub-millisecond compared
  // to the multi-second (and occasionally ~45 s) RES call this replaces.
  const idbHit = await persistentCache.get(key);
  if (idbHit) {
    memoryCache.set(key, idbHit);
    return idbHit;
  }

  // Layer 3 — coalesce concurrent requests for the same zone. The map click
  // fires prefetchZoneStats() at the same moment ZonePanel mounts and calls
  // fetchZoneStats(); without this they'd each pay the (cold, ~45 s) round
  // trip. Sharing one in-flight promise means a single network call.
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = networkFetch(req, key).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** Map of in-flight zone-stats requests, keyed by `cacheKey()`. */
const inFlight = new Map<string, Promise<ZoneStatsResponse>>();

async function networkFetch(req: ZoneStatsRequest, key: string): Promise<ZoneStatsResponse> {
  // RES's first call for an uncached (fso, cz_local) can take ~45s; the
  // Vercel function may still 504 if that happens behind a CDN/proxy. By
  // the time we retry, RES has cached the response and the second call
  // returns in ~1s — so a single retry on 504/502 is cheap insurance.
  const callOnce = () =>
    fetch(ZONE_STATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fso: req.fso,
        cz_local: req.cz_local,
        lang: req.lang ?? 'en',
      }),
    });

  let res: Response;
  try {
    res = await callOnce();
    if (res.status === 504 || res.status === 502) {
      res = await callOnce();
    }
  } catch (err) {
    throw new ZoneStatsError(
      err instanceof Error
        ? `Could not reach the zone-stats endpoint (${err.message}). ` +
          'It may not yet be deployed.'
        : 'Could not reach the zone-stats endpoint.',
    );
  }

  if (!res.ok) {
    throw new ZoneStatsError(
      `RES /zone_stats returned ${res.status}`,
      res.status,
    );
  }

  const body = (await res.json()) as ZoneStatsResponse;
  memoryCache.set(key, body);
  // Persist for the NEXT session too. Fire-and-forget — a failed IDB write
  // (private mode, quota exhaustion, etc.) must never break the response.
  void persistentCache.set(key, body);
  return body;
}

/**
 * Fire-and-forget cache warm-up. Called from MapView the instant a parcel is
 * clicked — using the cz_local + fso the tile already carries — so the
 * (possibly cold) zone aggregate is in flight in parallel with the parcel-data
 * fetch, instead of starting only after ZonePanel mounts. Never throws.
 */
export function prefetchZoneStats(req: ZoneStatsRequest): void {
  const key = cacheKey(req);
  if (memoryCache.has(key) || inFlight.has(key)) return;
  void fetchZoneStats(req).catch(() => {
    /* warm-up only — the panel's own fetch will surface any real error */
  });
}
