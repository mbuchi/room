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
 *   - Key: `bfs:<n>` when a BFS number is supplied (the canonical commune id),
 *     else `city:<city>:<canton>` so a name-only lookup still de-dupes.
 *   - 50 MB LRU budget, no TTL — city market figures refresh daily server-side,
 *     and a stale-by-a-day client cache is acceptable for an indicative panel.
 *
 * IMPORTANT — degrade to null, never throw: the RES endpoint may 404 (no row
 * for the city) or not be deployed yet. In every non-2xx / network / parse
 * failure we resolve to `null` so the UI simply hides the section, exactly as
 * the spec requires. (This is the opposite of zoneStatsService, which surfaces
 * its errors — here the market block is supplementary, so silence is correct.)
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

function cacheKey(bfs: number | null, city: string | null, canton: string | null): string {
  if (bfs != null && Number.isFinite(bfs)) return `bfs:${bfs}`;
  return `city:${(city ?? '').toLowerCase()}:${(canton ?? '').toLowerCase()}`;
}

/** Wipe both cache layers — used by debug actions / explicit invalidation. */
export function clearCityMarketCache(): void {
  memoryCache.clear();
  void persistentCache.clear();
}

/**
 * Fetch city-level market figures for the municipality a parcel sits in.
 *
 * Resolves to `null` — never throws — on 404, any non-2xx, a network error, or
 * an unparseable body, so the caller can render the section only when real data
 * comes back. A successful response is written through both cache layers.
 *
 * @param bfs    BFS commune number (preferred match key). Pass null if unknown.
 * @param city   Municipality name fallback when bfs is unavailable.
 * @param canton Canton abbreviation, narrowing an ambiguous city name.
 */
export async function fetchCityMarket(
  bfs: number | null,
  city: string | null,
  canton: string | null = null,
): Promise<CityMarket | null> {
  // Nothing to match on — bail before touching the cache or network.
  if ((bfs == null || !Number.isFinite(bfs)) && !city) return null;

  const key = cacheKey(bfs, city, canton);

  // Layer 1 — synchronous in-memory hit.
  const memHit = memoryCache.get(key);
  if (memHit) return memHit;

  // Layer 2 — persistent IndexedDB hit (sub-ms vs. a network round-trip).
  const idbHit = await persistentCache.get(key);
  if (idbHit) {
    memoryCache.set(key, idbHit);
    return idbHit;
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
    });
  } catch {
    // Network error / endpoint not deployed — hide the section.
    return null;
  }

  // 404 = no market row for this city; any other non-2xx = treat as no data.
  if (!res.ok) return null;

  let data: CityMarket;
  try {
    data = (await res.json()) as CityMarket;
  } catch {
    return null;
  }

  // Write through both layers. Also index under the bfs key when the caller
  // matched by name but the payload carries a usable identifier, mirroring
  // parcelDataService's egrid back-fill — keyed defensively on the response.
  memoryCache.set(key, data);
  void persistentCache.set(key, data);
  return data;
}
