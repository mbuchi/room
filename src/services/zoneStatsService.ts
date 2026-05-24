/**
 * Typed wrapper around `POST /res_api/zone_stats` — room's bespoke aggregate
 * endpoint that returns, for a given (FSO, CZ Local) zone:
 *   - the distribution + summary stats of every utilisation metric room
 *     plots (`ratio_v`, `free_v`, `ratio_s`, `gfz`, `bldg_height_m`,
 *     `bldg_floors_n`),
 *   - the four age-cohort utilisation means (now / last 20 / 40 / 60),
 *   - an unfiltered `parcels[]` list (egrid + area + volume + year) which
 *     drives both the scatter plot AND the choropleth via setFeatureState,
 *   - the list of other zones available within the same municipality so the
 *     ZoneSelectorDropdown can switch context without re-fetching parcel data.
 *
 * Responses are kept in a session-scoped Map cache keyed `${fso}:${cz_local}`
 * so re-selecting the same zone (e.g. when the user reopens a parcel) is
 * instant. The RES backend keeps its own LRU; this client cache shaves the
 * network round-trip entirely.
 */
// Calls go through the Vercel Edge proxy in `api/zone-stats.ts`, which
// injects the RES_API_TOKEN server-side.
const ZONE_STATS_URL = '/api/zone-stats';

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
  cohort_label: string;
  mean_ratio_v: number;
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

const cache = new Map<string, ZoneStatsResponse>();

function cacheKey(req: ZoneStatsRequest): string {
  return `${req.fso}:${req.cz_local}`;
}

export function getCachedZoneStats(
  req: ZoneStatsRequest,
): ZoneStatsResponse | undefined {
  return cache.get(cacheKey(req));
}

export function clearZoneStatsCache(): void {
  cache.clear();
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
  const hit = cache.get(cacheKey(req));
  if (hit) return hit;

  let res: Response;
  try {
    res = await fetch(ZONE_STATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fso: req.fso,
        cz_local: req.cz_local,
        lang: req.lang ?? 'en',
      }),
    });
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
  cache.set(cacheKey(req), body);
  return body;
}
