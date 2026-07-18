// The address room shows in the navbar search box after a map click.
//
// The shared `formatParcelAddress` joins a parcel's tile properties back into
// the geo.admin search label ("Nüschelerstrasse 30 8001 Zürich") so the
// map-click path and the search-dropdown path write the same string. Its city
// key list includes `fso_name_2021`, though — and every parcel_2025_07 row
// carries that, including the ~25% of an urban tile with no address at all
// (courtyards, roads, unbuilt land: `address`/`zip`/`cityname` all null but
// `fso_name_2021` = "Zürich"). Left alone that would drop a bare municipality
// name into an address field.
//
// So: accept the label only once the parcel has a street or a zip. Partial data
// still degrades the way the suite expects — street-only, or "8001 Zürich" with
// no street — and a genuinely addressless parcel yields null, which leaves the
// input empty.
// Imported from the /geoadmin subpath rather than the package root: the root
// entry pulls in browser-only modules, and room's vitest env is `node`.
import { formatParcelAddress, parcelAddressParts } from '@aireon/shared/geoadmin';

export function fullParcelAddress(
  properties: Record<string, unknown> | null | undefined,
): string | null {
  const { street, zip } = parcelAddressParts(properties);
  if (!street && !zip) return null;
  return formatParcelAddress(properties);
}
