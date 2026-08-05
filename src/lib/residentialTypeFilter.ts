// Residential-type parcel filter for the on-map parcels.
//
// The parcel_2025_07 vector tiles carry `bldg_flats` (number of residential
// dwellings). The filter is an exhaustive two-way partition: two or more
// dwellings are multi-unit, while every other value (including
// missing/invalid/zero/one) is single-unit.

export type ResidentialTypeFilter = 'single-unit' | 'multi-unit';

export const RESIDENTIAL_TYPE_FILTERS: ResidentialTypeFilter[] = [
  'single-unit',
  'multi-unit',
];

export const DEFAULT_RESIDENTIAL_TYPE_FILTER: ResidentialTypeFilter = 'single-unit';
export const RESIDENTIAL_TYPE_STORAGE_KEY = 'room:residentialTypeFilter';

export function isResidentialTypeFilter(
  value: unknown,
): value is ResidentialTypeFilter {
  return RESIDENTIAL_TYPE_FILTERS.includes(value as ResidentialTypeFilter);
}

// SSR-safe read with migration from the former four-option model. Apartments
// retain the multi-unit meaning; every other old or unknown value becomes the
// exhaustive single-unit fallback.
export function loadResidentialTypeFilter(): ResidentialTypeFilter {
  if (typeof window === 'undefined') return DEFAULT_RESIDENTIAL_TYPE_FILTER;
  try {
    const raw = window.localStorage.getItem(RESIDENTIAL_TYPE_STORAGE_KEY);
    const next = isResidentialTypeFilter(raw)
      ? raw
      : raw === 'apartments'
        ? 'multi-unit'
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

// MapLibre expression for the exhaustive two-way split. `to-number(..., 0)`
// keeps missing and invalid values in single-unit instead of dropping them.
export function residentialTypeCondition(
  filter: ResidentialTypeFilter,
): unknown[] {
  const flatsExpr = ['to-number', ['get', 'bldg_flats'], 0];
  return filter === 'multi-unit'
    ? ['>=', flatsExpr, 2]
    : ['<', flatsExpr, 2];
}
