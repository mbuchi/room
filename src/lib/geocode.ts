// Mapbox geocoding — resolves a free-text Swiss address to WGS84 coordinates.
//
// The SwissNovo suite standardises on the Mapbox geocoder so address search
// behaves identically across every app. The token is a public (pk.*) Mapbox
// token — safe to ship client-side — sourced from VITE_MAPBOX_TOKEN.

const TOKEN: string = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';

export interface GeocodeResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface MapboxFeature {
  id?: string | number;
  properties?: { full_address?: string; name?: string };
  geometry?: { coordinates?: number[] };
}

/**
 * Forward-geocode a free-text address against the Mapbox geocoding API,
 * restricted to Switzerland. Returns up to 5 ranked matches with WGS84
 * coordinates. Throws on network/HTTP failure so callers can show a state.
 */
export async function geocodeAddress(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('country', 'ch');
  url.searchParams.set('limit', '5');
  url.searchParams.set('types', 'address,street,place');
  url.searchParams.set('access_token', TOKEN);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as { features?: MapboxFeature[] };

  return (data.features ?? [])
    .map((f): GeocodeResult | null => {
      const coords = f?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: String(f.id ?? `${lat},${lng}`),
        label: f.properties?.full_address || f.properties?.name || `${lat}, ${lng}`,
        lat,
        lng,
      };
    })
    .filter((r): r is GeocodeResult => r !== null);
}
