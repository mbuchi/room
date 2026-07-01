// Residential-type parcel filter for the on-map parcels.
//
// The parcel_2025_07 vector tiles carry `bldg_flats` (number of residential
// dwellings) and `bldg_count` (number of buildings) even though room's own
// panel/facts code does not currently read them. This lets the map be narrowed
// to parcels that carry buildings (All), single-dwelling parcels (Houses) or
// multi-dwelling parcels (Apartments). Ported from roofs/roots, with room's own
// extra "No filter" mode that shows literally every parcel (including
// agricultural / vacant / building-less ones) — that is the escape hatch room
// keeps so nothing is ever hidden by default when the user wants the raw map.

export type ResidentialTypeFilter = 'none' | 'all' | 'houses' | 'apartments';

export const RESIDENTIAL_TYPE_FILTERS: ResidentialTypeFilter[] = [
  'none',
  'all',
  'houses',
  'apartments',
];

export const DEFAULT_RESIDENTIAL_TYPE_FILTER: ResidentialTypeFilter = 'all';
export const RESIDENTIAL_TYPE_STORAGE_KEY = 'room:residentialTypeFilter';

export function isResidentialTypeFilter(
  value: unknown,
): value is ResidentialTypeFilter {
  return RESIDENTIAL_TYPE_FILTERS.includes(value as ResidentialTypeFilter);
}

// SSR-safe read of the persisted choice; validates the stored value and falls
// back to 'all' on anything unexpected (missing key, corrupt value, no window).
export function loadResidentialTypeFilter(): ResidentialTypeFilter {
  if (typeof window === 'undefined') return DEFAULT_RESIDENTIAL_TYPE_FILTER;
  try {
    const raw = window.localStorage.getItem(RESIDENTIAL_TYPE_STORAGE_KEY);
    return isResidentialTypeFilter(raw) ? raw : DEFAULT_RESIDENTIAL_TYPE_FILTER;
  } catch {
    return DEFAULT_RESIDENTIAL_TYPE_FILTER;
  }
}

// The MapLibre filter sub-expression for a given mode, or `null` for 'none'
// (no filter — every parcel stays visible, room's escape hatch). All = parcels
// that carry at least one building (`bldg_count` > 0); Houses = exactly one
// dwelling; Apartments = two or more. `['to-number', ..., 0]` defaults a
// missing/NaN field to 0, so unbuilt parcels never match all/houses/apartments.
export function residentialTypeCondition(
  filter: ResidentialTypeFilter,
): unknown[] | null {
  const flatsExpr = ['to-number', ['get', 'bldg_flats'], 0];
  if (filter === 'all') return ['>', ['to-number', ['get', 'bldg_count'], 0], 0];
  if (filter === 'houses') return ['==', flatsExpr, 1];
  if (filter === 'apartments') return ['>=', flatsExpr, 2];
  return null; // 'none' -> no filter
}
