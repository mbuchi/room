import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cacheKey,
  canLookupMarket,
  clearCityMarketCache,
  fetchCityMarket,
} from './cityMarketService';

const realFetch = globalThis.fetch;

const EMPTY_FIGURES = {
  price_m2: null,
  price_m2_min: null,
  price_m2_max: null,
  median: null,
  p10: null,
  p90: null,
  by_rooms: {},
};

function marketBody(city: string) {
  return {
    city_name: city,
    canton: 'ZH',
    scrape_date: '2026-08-19',
    matched_via: 'bfs',
    currency: 'CHF',
    apartment: { rent: { ...EMPTY_FIGURES, median: 2400 }, buy: EMPTY_FIGURES },
    house: { rent: EMPTY_FIGURES, buy: EMPTY_FIGURES },
    listings: {
      apartments_for_rent: 12,
      houses_for_rent: null,
      apartments_for_sale: null,
      houses_for_sale: null,
    },
  };
}

function okFetch(body: unknown = marketBody('Zürich')) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function statusFetch(status: number) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  });
}

beforeEach(() => {
  (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
  clearCityMarketCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('cacheKey', () => {
  it('carries the bfs, the city AND the canton', () => {
    expect(cacheKey(261, 'Zürich', 'ZH')).toBe('bfs:261|city:zürich|canton:zh');
  });

  it('keeps two lookups on the same bfs apart when the name differs', () => {
    // RES resolves `bfs` through the `vacancy_lwz` registry, which is missing
    // several communes, so the name the caller sends can be what actually
    // matched. A key that dropped it would serve one commune's figures under
    // another's identity.
    expect(cacheKey(261, 'Zürich', 'ZH')).not.toBe(cacheKey(261, 'Winterthur', 'ZH'));
  });

  it('keeps a bfs-only lookup apart from the same bfs sent with a name', () => {
    expect(cacheKey(261, null, null)).not.toBe(cacheKey(261, 'Zürich', null));
  });

  it('keeps the same city in two cantons apart', () => {
    expect(cacheKey(null, 'Wil', 'SG')).not.toBe(cacheKey(null, 'Wil', 'ZH'));
  });

  it('is case-insensitive on the name pair, which RES matches case-blind', () => {
    expect(cacheKey(261, 'ZÜRICH', 'zh')).toBe(cacheKey(261, 'zürich', 'ZH'));
  });

  it('treats a non-finite bfs as no bfs at all', () => {
    expect(cacheKey(NaN, 'Zürich', 'ZH')).toBe(cacheKey(null, 'Zürich', 'ZH'));
  });
});

describe('canLookupMarket', () => {
  it('needs a finite bfs or a city name', () => {
    expect(canLookupMarket(261, null)).toBe(true);
    expect(canLookupMarket(null, 'Zürich')).toBe(true);
    expect(canLookupMarket(null, null)).toBe(false);
    expect(canLookupMarket(NaN, null)).toBe(false);
    expect(canLookupMarket(NaN, '')).toBe(false);
  });
});

describe('fetchCityMarket outcomes', () => {
  it('resolves ok with the payload on a 200', async () => {
    globalThis.fetch = okFetch() as unknown as typeof fetch;
    const res = await fetchCityMarket(261, 'Zürich', 'ZH');
    expect(res.status).toBe('ok');
    expect(res.status === 'ok' && res.data.city_name).toBe('Zürich');
  });

  it('resolves missing on a 404 — RES has no row for this commune', async () => {
    globalThis.fetch = statusFetch(404) as unknown as typeof fetch;
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('missing');
  });

  it('resolves error on a 500 — the figures were never looked up', async () => {
    globalThis.fetch = statusFetch(500) as unknown as typeof fetch;
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('error');
  });

  it('resolves error on the proxy\'s own 400 / 405 / 502', async () => {
    for (const status of [400, 405, 502]) {
      clearCityMarketCache();
      globalThis.fetch = statusFetch(status) as unknown as typeof fetch;
      expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('error');
    }
  });

  it('resolves error when the request never completes', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('error');
  });

  it('resolves error on an unparseable body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('not json');
      },
    }) as unknown as typeof fetch;
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('error');
  });

  it('resolves missing without a request when there is nothing to match on', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    expect((await fetchCityMarket(null, null, null)).status).toBe('missing');
    expect(f).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    await expect(fetchCityMarket(261, 'Zürich', 'ZH')).resolves.toBeTruthy();
  });
});

describe('fetchCityMarket caching', () => {
  it('serves a repeat lookup from memory — one network call', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    await fetchCityMarket(261, 'Zürich', 'ZH');
    await fetchCityMarket(261, 'Zürich', 'ZH');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('does not serve one commune under another identity on the same bfs', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => marketBody('Zürich') })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => marketBody('Winterthur') });
    globalThis.fetch = f as unknown as typeof fetch;

    const a = await fetchCityMarket(261, 'Zürich', 'ZH');
    const b = await fetchCityMarket(261, 'Winterthur', 'ZH');

    expect(f).toHaveBeenCalledTimes(2);
    expect(a.status === 'ok' && a.data.city_name).toBe('Zürich');
    expect(b.status === 'ok' && b.data.city_name).toBe('Winterthur');
  });

  it('sends bfs, city and canton upstream', async () => {
    const f = okFetch();
    globalThis.fetch = f as unknown as typeof fetch;
    await fetchCityMarket(261, 'Zürich', 'ZH');
    const url = new URL(f.mock.calls[0][0] as string, 'https://room.aireon.ch');
    expect(url.searchParams.get('bfs')).toBe('261');
    expect(url.searchParams.get('city')).toBe('Zürich');
    expect(url.searchParams.get('canton')).toBe('ZH');
  });

  it('caches only a real answer, so a retry after an outage asks again', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => marketBody('Zürich') });
    globalThis.fetch = f as unknown as typeof fetch;

    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('error');
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('caches nothing for an uncovered commune either — coverage can arrive', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => marketBody('Zürich') });
    globalThis.fetch = f as unknown as typeof fetch;

    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('missing');
    expect((await fetchCityMarket(261, 'Zürich', 'ZH')).status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
