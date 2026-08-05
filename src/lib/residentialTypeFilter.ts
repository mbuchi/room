// Residential-type parcel filter for the on-map parcels.
//
// The parcel_2025_07 vector tiles carry `bldg_flats` (number of residential
// dwellings). Single-unit and Multi-unit form an exhaustive partition, while
// All removes the residential condition and combines both groups.

export type ResidentialTypeFilter = 'all' | 'single-unit' | 'multi-unit';

export const RESIDENTIAL_TYPE_FILTERS: ResidentialTypeFilter[] = [
  'all',
  'single-unit',
  'multi-unit',
];

export const DEFAULT_RESIDENTIAL_TYPE_FILTER: ResidentialTypeFilter = 'all';
export const RESIDENTIAL_TYPE_STORAGE_KEY = 'room:residentialTypeFilter';

export function isResidentialTypeFilter(
  value: unknown,
): value is ResidentialTypeFilter {
  return RESIDENTIAL_TYPE_FILTERS.includes(value as ResidentialTypeFilter);
}

// SSR-safe read with migration from the former four-option model. The three
// current values are preserved; Apartments and Houses retain their unit-group
// meanings, None maps to All, and missing/corrupt values use the All default.
export function loadResidentialTypeFilter(): ResidentialTypeFilter {
  if (typeof window === 'undefined') return DEFAULT_RESIDENTIAL_TYPE_FILTER;
  try {
    const raw = window.localStorage.getItem(RESIDENTIAL_TYPE_STORAGE_KEY);
    const next = isResidentialTypeFilter(raw)
      ? raw
      : raw === 'apartments'
        ? 'multi-unit'
        : raw === 'houses'
          ? 'single-unit'
          : raw === 'none'
            ? 'all'
            : DEFAULT_RESIDENTIAL_TYPE_FILTER;
    if (raw && raw !== next) {
      try {
        window.localStorage.setItem(RESIDENTIAL_TYPE_STORAGE_KEY, next);
      } catch {
        // Keep the correctly migrated in-memory choice when storage is read-only.
      }
    }
    return next;
  } catch {
    return DEFAULT_RESIDENTIAL_TYPE_FILTER;
  }
}

// MapLibre expression for the three-way control. All returns null so callers
// restore the complete base layer; `to-number(..., 0)` keeps missing and invalid
// values in single-unit instead of dropping them.
export function residentialTypeCondition(
  filter: ResidentialTypeFilter,
): unknown[] | null {
  if (filter === 'all') return null;
  const flatsExpr = ['to-number', ['get', 'bldg_flats'], 0];
  return filter === 'multi-unit'
    ? ['>=', flatsExpr, 2]
    : ['<', flatsExpr, 2];
}
