import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchParcelData, ParcelDataError, clearParcelDataCache } from './parcelDataService';

const realFetch = globalThis.fetch;

function mockJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  // No IndexedDB in node → the persistent cache no-ops; the service still
  // resolves from memory + the mocked network. (This is also the live
  // fallback path the v0.5.1 fix guarantees when IDB is blocked.)
  (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
  clearParcelDataCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('fetchParcelData — normalisation', () => {
  it('maps fso_num→fso, passes ratio_v/ratio_s through as percentages, resolves egrid aliases', async () => {
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 261,
        municipality_name: 'Zürich',
        cz_local: 'dreigeschossige Wohnzone',
        ratio_v: 91,
        ratio_s: 24.4,
        parcel_area: 500,
        EGRID: 'CH-unit-1',
        address: 'Bahnhofstrasse 1',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.39, lng: 8.53, egrid: 'CH-unit-1' });
    expect(d.fso).toBe(261);
    expect(d.municipality_name).toBe('Zürich');
    expect(d.ratio_v).toBe(91); // percentage, NOT divided to 0.91
    expect(d.ratio_s).toBe(24.4);
    expect(d.egrid).toBe('CH-unit-1');
    expect(d.address).toBe('Bahnhofstrasse 1');
  });

  it('joins zip + city onto address_full, leaving address itself street-only', async () => {
    // RES serves the same parcel_2025_07 row the tiles do, so zip (a Number)
    // and cityname come back alongside address.
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 261,
        address: 'Nüschelerstrasse 46',
        zip: 8001,
        cityname: 'Zürich',
        EGRID: 'CH-unit-addr',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.37, lng: 8.53, egrid: 'CH-unit-addr' });
    expect(d.address).toBe('Nüschelerstrasse 46'); // panel header — unchanged
    expect(d.address_full).toBe('Nüschelerstrasse 46 8001 Zürich'); // navbar search box
    expect(d.zip).toBe('8001'); // locality subtitle — Number on the wire, string out
  });

  it('leaves address_full null for a parcel with no address', async () => {
    // Courtyards/roads carry fso_name_2021 but no address, zip or cityname —
    // the navbar input must stay empty rather than show a bare municipality.
    globalThis.fetch = mockJson({
      properties: { fso_num: 261, fso_name_2021: 'Zürich', EGRID: 'CH-unit-noaddr' },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.37, lng: 8.53, egrid: 'CH-unit-noaddr' });
    expect(d.address_full).toBeNull();
    expect(d.zip).toBeNull(); // subtitle degrades to the bare municipality
  });

  // The parcel's zone (@aireon/shared/parcel-zone v1.177.0,
  // PARCEL_ZONE_STANDARD.md): the municipal designation first; the federal
  // category only where the municipal one is blank. Real production rows, so
  // a re-ordered chain fails here instead of passing on synthetic data. The
  // raw cz_local stays on the record as the zone-stats cohort key.
  it('resolves the municipal designation as `zone` and keeps the raw cz_local as the cohort key (Grenchen SO)', async () => {
    // Lingerizstrasse, Grenchen — "Wohnzone, Bauklasse 4" is the zone; the
    // federal category "Wohnzonen" is a filter, never the label.
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 2546,
        municipality_name: 'Grenchen',
        cz_local: 'Wohnzone, Bauklasse 4',
        cz_canton: 'Wohnzone 4 G',
        cz_harmonized: 'Wohnzonen',
        cz_canton_name: 'SO',
        EGRID: 'CH-unit-grenchen',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.19, lng: 7.39, egrid: 'CH-unit-grenchen' });
    expect(d.zone).toBe('Wohnzone, Bauklasse 4');
    expect(d.cz_local).toBe('Wohnzone, Bauklasse 4'); // /zone_stats cohort key, unchanged
  });

  it('falls back to the federal category only where the municipal designation is blank', async () => {
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 2546,
        cz_local: null,
        cz_canton: 'Wohnzone 4 G',
        cz_harmonized: 'Wohnzonen',
        cz_canton_name: 'SO',
        EGRID: 'CH-unit-nolocal',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.19, lng: 7.39, egrid: 'CH-unit-nolocal' });
    expect(d.zone).toBe('Wohnzonen');
    expect(d.cz_local).toBeNull();
  });

  it('keeps the municipal designation where no federal category exists (Zürich), never the ordinance sentence', async () => {
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 261,
        cz_local: 'dreigeschossige Wohnzone',
        cz_harmonized: null,
        cz_canton: 'siehe gültige Bau- und Zonenordnung der Stadt Zürich',
        cz_canton_name: 'ZH',
        EGRID: 'CH-unit-zh',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.37, lng: 8.53, egrid: 'CH-unit-zh' });
    expect(d.zone).toBe('dreigeschossige Wohnzone');
    expect(d.cz_local).toBe('dreigeschossige Wohnzone');
  });

  it('leaves zone null when nothing usable remains', async () => {
    globalThis.fetch = mockJson({
      properties: {
        fso_num: 261,
        cz_local: null,
        cz_harmonized: null,
        cz_canton: 'siehe gültige Bau- und Zonenordnung der Stadt Zürich',
        cz_canton_name: 'ZH',
        EGRID: 'CH-unit-nozone',
      },
    }) as unknown as typeof fetch;

    const d = await fetchParcelData({ lat: 47.37, lng: 8.53, egrid: 'CH-unit-nozone' });
    expect(d.zone).toBeNull();
  });

  it('throws ParcelDataError on a non-2xx response', async () => {
    globalThis.fetch = mockJson({}, false, 500) as unknown as typeof fetch;
    await expect(fetchParcelData({ lat: 1, lng: 2, egrid: 'CH-unit-err' })).rejects.toBeInstanceOf(ParcelDataError);
  });

  it('serves a repeat lookup from cache without a second network call', async () => {
    const f = mockJson({ properties: { fso_num: 1, parcel_id: 'CH-unit-2', ratio_v: 50 } });
    globalThis.fetch = f as unknown as typeof fetch;
    await fetchParcelData({ lat: 1, lng: 2, egrid: 'CH-unit-2' });
    await fetchParcelData({ lat: 1, lng: 2, egrid: 'CH-unit-2' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});
