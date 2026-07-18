import { describe, it, expect } from 'vitest';
import { fullParcelAddress } from './parcelAddress';

describe('fullParcelAddress', () => {
  it('matches the string the search dropdown writes for the same parcel', () => {
    // Verbatim parcel_2025_07 tile properties (zip arrives as a Number), and
    // the exact label geo.admin's forward search returns for that address.
    expect(
      fullParcelAddress({ address: 'Nüschelerstrasse 30', zip: 8001, cityname: 'Zürich' }),
    ).toBe('Nüschelerstrasse 30 8001 Zürich');
  });

  it('reads the RES /parcel_data shape too — same keys, same label', () => {
    expect(
      fullParcelAddress({ address: 'Nüschelerstrasse 46', zip: 8001, cityname: 'Zürich' }),
    ).toBe('Nüschelerstrasse 46 8001 Zürich');
  });

  it('leaves an addressless parcel empty instead of naming the municipality', () => {
    // A courtyard/road row: no address, no zip, no cityname — but fso_name_2021
    // is always populated, which the shared helper alone would emit on its own.
    expect(
      fullParcelAddress({ address: null, zip: null, cityname: null, fso_name_2021: 'Zürich' }),
    ).toBeNull();
    expect(fullParcelAddress({ parcel_id: 'CH899977779164' })).toBeNull();
    expect(fullParcelAddress(null)).toBeNull();
    expect(fullParcelAddress(undefined)).toBeNull();
  });

  it('degrades to whatever the parcel actually carries', () => {
    expect(fullParcelAddress({ address: 'Talacker 34' })).toBe('Talacker 34');
    expect(fullParcelAddress({ zip: 3011, cityname: 'Bern' })).toBe('3011 Bern');
  });

  it('is space-joined, never comma-joined', () => {
    expect(
      fullParcelAddress({ address: 'Utoquai 4', zip: 8001, cityname: 'Zürich' }),
    ).not.toContain(',');
  });
});
