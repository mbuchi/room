import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchZoneStats,
  prefetchZoneStats,
  getCachedZoneStats,
  clearZoneStatsCache,
  ZoneStatsError,
} from './zoneStatsService';

const realFetch = globalThis.fetch;

const ZONE_BODY = {
  zone: { fso: 261, municipality_name: 'Zürich', cz_local: 'W3', cz_canton: null, parcel_count: 10 },
  other_zones: [],
  distributions: {},
  summary: { ratio_v: { p5: 0, p25: 36, p50: 91, p75: 142, p95: 282, min: 0, max: 999, mean: 110, n: 10 } },
  age_cohorts: {},
  parcels: [],
};

function okFetch(body: unknown = ZONE_BODY) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
  clearZoneStatsCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('fetchZoneStats', () => {
  it('de-duplicates concurrent requests for the same zone into ONE network call', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    const [a, b] = await Promise.all([
      fetchZoneStats({ fso: 261, cz_local: 'W3' }),
      fetchZoneStats({ fso: 261, cz_local: 'W3' }),
    ]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a.zone.municipality_name).toBe('Zürich');
  });

  it('caches in memory — a repeat call makes no further network request', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    await fetchZoneStats({ fso: 261, cz_local: 'W3' });
    await fetchZoneStats({ fso: 261, cz_local: 'W3' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('surfaces a ZoneStatsError on a non-2xx response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' }) as unknown as typeof fetch;
    await expect(fetchZoneStats({ fso: 9, cz_local: 'X' })).rejects.toBeInstanceOf(ZoneStatsError);
  });
});

describe('prefetchZoneStats', () => {
  it('warms the cache so a later read is a synchronous hit (no second call)', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    prefetchZoneStats({ fso: 261, cz_local: 'W3' });
    // allow the fire-and-forget fetch to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(getCachedZoneStats({ fso: 261, cz_local: 'W3' })).toBeTruthy();
    await fetchZoneStats({ fso: 261, cz_local: 'W3' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('never throws even when the network fails', () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(() => prefetchZoneStats({ fso: 1, cz_local: 'Y' })).not.toThrow();
  });
});
