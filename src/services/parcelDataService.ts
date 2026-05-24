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
 */
// Calls go through the Vercel Edge proxy in `api/parcel-data.ts`, which
// injects the RES_API_TOKEN server-side so it never reaches the browser.
// In dev, the relative URL hits whatever `vercel dev` or the Vite proxy
// resolves; in prod it hits room's own /api/parcel-data Edge function.
const PARCEL_DATA_URL = '/api/parcel-data';

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
  return normalize(props);
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
  return {
    fso: numberOrNull(props.fso),
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
    parcel_id: stringOrNull(props.parcel_id),
    egrid: stringOrNull(props.egrid ?? props.EGRID),
  };
}
