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
