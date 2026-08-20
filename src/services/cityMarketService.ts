/**
 * Typed wrapper around `GET /res_api/city-market/by-parcel` on the RES backend,
 * surfaced to room via the Vercel proxy in `api/city-market.ts` (which injects
 * the RES token + `X-RES-API-Version: 2` header server-side).
 *
 * The endpoint returns RealAdvisor-sourced, CITY-LEVEL market figures (rent +
 * buy, apartments + houses) for the municipality a parcel sits in — keyed by
 * the BFS commune number, with a city/canton name pair as the fallback match.
 * room's MarketDataSection renders these in the parcel-facts panel.
 *
 * Caching mirrors parcelDataService / zoneStatsService: an in-memory `Map`
 * fronts an `IndexedDBCache` over the shared `room-cache` DB so a re-open of a
 * previously-seen city is instant.
 *   - Key: every input that can change the answer, because RES matches on the
 *     BFS number AND on the city/canton pair the caller sends. See `cacheKey`.
 *   - 50 MB LRU budget, no TTL — city market figures refresh daily server-side,
 *     and a stale-by-a-day client cache is acceptable for an indicative panel.
 *
 * IMPORTANT — never throws, but the two bad outcomes stay apart. `missing` is
 * RES answering that it has no row for this commune (small towns are genuinely
 * uncovered); `error` is the question never getting an answer (proxy down, RES
 * token stale, offline). The section says something different for each, because
 * "no market data for Zurich" is a false statement about the data when the real
 * problem is that the request failed. (zoneStatsService throws instead; here the
 * market block is supplementary, so a resolved outcome is the right shape.)
 */
import { IndexedDBCache } from '../utils/cache';

// Calls go through the Vercel proxy in `api/city-market.ts`.
const CITY_MARKET_URL = '/api/city-market';

const PERSISTENT_CACHE_MAX_BYTES = 50 * 1024 * 1024;

/** One rent-or-buy figure block for a given property type. */
export interface MarketFigures {
  /** Average price per m² per year (rent) or per m² (buy), in CHF. */
  price_m2: number | null;
  price_m2_min: number | null;
  price_m2_max: number | null;
  /** Median asking figure (CHF) — the headline number. */
  median: number | null;
  /** 10th / 90th percentile asking figures (CHF) — the 80% range. */
  p10: number | null;
  p90: number | null;
  /**
   * Average figure broken down by room count. Keys are property-type specific:
   *   - apartment: 'studio' | '2' | '3' | '4' | '5'
   *   - house:     '4' | '5' | '6' | '7' | '8'
   * Values are CHF (median/average for that room bucket) or null when missing.
   */
  by_rooms: Record<string, number | null>;
}

export interface CityMarket {
  city_name: string;
  canton: string;
  /** ISO date the RealAdvisor figures were scraped (server-formatted). */
  scrape_date: string;
  /** How RES matched the parcel to a city row (e.g. "bfs", "city+canton"). */
  matched_via: string;
  /** Currency code for every figure in the payload, e.g. "CHF". */
  currency: string;
  apartment: { rent: MarketFigures; buy: MarketFigures };
  house: { rent: MarketFigures; buy: MarketFigures };
  listings: {
    apartments_for_rent: number | null;
    houses_for_rent: number | null;
    apartments_for_sale: number | null;
    houses_for_sale: number | null;
  };
}

const memoryCache = new Map<string, CityMarket>();
const persistentCache = new IndexedDBCache<CityMarket>(
  'room-cache',
  'city-market',
  // List EVERY sibling store so whichever service opens the shared DB first
  // creates the complete schema — otherwise this store is silently never
  // created (see cache.ts → IndexedDBCacheOptions.stores). The cache module's
  // DB_VERSION was bumped alongside adding 'city-market' so the upgrade runs.
  { maxBytes: PERSISTENT_CACHE_MAX_BYTES, stores: ['parcel-data', 'zone-stats', 'city-market'] },
);

/**
 * Cache key. Every input that can change the answer rides in it.
 *
 * A key that collapsed to `bfs:<n>` whenever a BFS was present would serve one
 * commune's figures under another's identity: RES resolves `bfs` through the
 * `vacancy_lwz` registry, which is missing several communes, so a lookup that
 * only matched because the NAME was also sent would share its entry with one
 * that sent no name at all — and with the caller's `city` now a real fallback
 * rung in the RES lookup, the two answers differ.
 */
export function cacheKey(bfs: number | null, city: string | null, canton: string | null): string {
  const key = bfs != null && Number.isFinite(bfs) ? String(bfs) : '';
  return `bfs:${key}|city:${(city ?? '').toLowerCase()}|canton:${(canton ?? '').toLowerCase()}`;
}

/** True when there is enough identity to attempt a lookup at all. */
export function canLookupMarket(bfs: number | null, city: string | null): boolean {
  return (bfs != null && Number.isFinite(bfs)) || !!city;
}

/**
 * Outcome of a lookup.
 *
 * `missing` is a fact about coverage that the section is allowed to state out
 * loud; `error` is a fact about this one request, and must never be phrased as
 * "this municipality has no market data".
 */
export type CityMarketResult =
  | { status: 'ok'; data: CityMarket }
  | { status: 'missing' }
  | { status: 'error' };

/** Wipe both cache layers — used by debug actions / explicit invalidation. */
export function clearCityMarketCache(): void {
  memoryCache.clear();
  void persistentCache.clear();
}

/**
 * Fetch city-level market figures for the municipality a parcel sits in.
 *
 * Never throws. A 404 resolves to `missing` (RES has no row for this commune);
 * every other failure — non-2xx, network error, aborted request, unparseable
 * body — resolves to `error`, so the caller can tell an uncovered commune from
 * an outage. A successful response is written through both cache layers.
 *
 * @param bfs    BFS commune number (preferred match key). Pass null if unknown.
 * @param city   Municipality name fallback when bfs is unavailable.
 * @param canton Canton abbreviation, narrowing an ambiguous city name.
 * @param signal Aborts the request when the selection changes under it.
 */
export async function fetchCityMarket(
  bfs: number | null,
  city: string | null,
  canton: string | null = null,
  signal?: AbortSignal,
): Promise<CityMarketResult> {
  // Nothing to match on — bail before touching the cache or network.
  if (!canLookupMarket(bfs, city)) return { status: 'missing' };

  const key = cacheKey(bfs, city, canton);

  // Layer 1 — synchronous in-memory hit.
  const memHit = memoryCache.get(key);
  if (memHit) return { status: 'ok', data: memHit };

  // Layer 2 — persistent IndexedDB hit (sub-ms vs. a network round-trip).
  const idbHit = await persistentCache.get(key);
  if (idbHit) {
    memoryCache.set(key, idbHit);
    return { status: 'ok', data: idbHit };
  }

  const params = new URLSearchParams();
  if (bfs != null && Number.isFinite(bfs)) params.set('bfs', String(bfs));
  if (city) params.set('city', city);
  if (canton) params.set('canton', canton);

  let res: Response;
  try {
    res = await fetch(`${CITY_MARKET_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch {
    // Network error / endpoint not deployed / aborted — the figures were never
    // looked up, so this is an outage, not an answer about coverage.
    return { status: 'error' };
  }

  // Only 404 is a statement about coverage. 5xx, the proxy's own 400/405/502
  // and a missing RES token all mean the question never reached the data.
  if (res.status === 404) return { status: 'missing' };
  if (!res.ok) return { status: 'error' };

  let data: CityMarket;
  try {
    data = (await res.json()) as CityMarket;
  } catch {
    return { status: 'error' };
  }
  if (!data || typeof data !== 'object') return { status: 'error' };

  memoryCache.set(key, data);
  void persistentCache.set(key, data);
  return { status: 'ok', data };
}
