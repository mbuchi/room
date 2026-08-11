// resProxy.test — behavior-parity checks for the A2 shared-base migration of
// room's Vercel functions.
//
// room's api/ proxies stay on raw fetches (parcel-data and city-market carry
// FULL-URL env overrides a path-typed client cannot express; zone_stats,
// city-market and poi-osm are schema gaps) — but every default URL now
// derives from the shared RES_API_BASE_URL constant. These tests pin that
// derivation plus each handler's unchanged outward contract.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RES_API_BASE_URL } from '@aireon/shared/api';
import parcelDataHandler from '../parcel-data';
import cityMarketHandler from '../city-market';
import zoneStatsHandler from '../zone-stats';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Install a fetch mock and return a getter for the captured Request. */
function mockFetch(response: Response): () => Request {
  let captured: Request | undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    captured = input instanceof Request ? input : new Request(input, init);
    return response;
  });
  return () => {
    if (!captured) throw new Error('fetch was not called');
    return captured;
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('shared base constant', () => {
  it('is the production RES host the old files hardcoded', () => {
    expect(RES_API_BASE_URL).toBe('https://res.zeroo.ch');
  });
});

describe('parcel-data handler (env-overridable full URL, default from shared base)', () => {
  const post = (body: unknown) =>
    new Request('https://room.aireon.ch/api/parcel-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('POSTs the normalized body to the shared-base default URL with the env token', async () => {
    vi.stubEnv('RES_API_TOKEN', 'env-tok');
    const req = mockFetch(jsonResponse({ features: [] }));
    const out = await parcelDataHandler(post({ lat: 47.37, lng: 8.54 }));
    expect(req().url).toBe(`${RES_API_BASE_URL}/res_api/parcel_data`);
    expect(req().method).toBe('POST');
    expect(req().headers.get('token')).toBe('env-tok');
    expect(await req().text()).toBe(
      JSON.stringify({ lat: 47.37, lng: 8.54, egrid: null, structure: 'default' }),
    );
    expect(out.status).toBe(200);
    expect(await out.json()).toEqual({ features: [] });
  });

  it('rejects a body without numeric coordinates locally, without calling RES', async () => {
    vi.stubEnv('RES_API_TOKEN', 'env-tok');
    const spy = vi.spyOn(globalThis, 'fetch');
    const out = await parcelDataHandler(post({ lat: 'x' }));
    expect(out.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails fast when RES_API_TOKEN is not configured', async () => {
    vi.stubEnv('RES_API_TOKEN', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const out = await parcelDataHandler(post({ lat: 47.37, lng: 8.54 }));
    expect(out.status).toBe(500);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('city-market handler (schema gap + env-overridable full URL)', () => {
  it('forwards only-supplied params to the shared-base default URL', async () => {
    vi.stubEnv('RES_API_TOKEN', 'env-tok');
    const req = mockFetch(jsonResponse({ city: 'Zurich' }));
    const out = await cityMarketHandler(
      new Request('https://room.aireon.ch/api/city-market?bfs=261'),
    );
    const url = new URL(req().url);
    expect(url.origin).toBe(RES_API_BASE_URL);
    expect(url.pathname).toBe('/res_api/city-market/by-parcel');
    expect(url.searchParams.get('bfs')).toBe('261');
    expect(url.searchParams.has('city')).toBe(false);
    expect(req().headers.get('token')).toBe('env-tok');
    expect(out.status).toBe(200);
  });

  it('passes an upstream 404 through unchanged (no data for city)', async () => {
    vi.stubEnv('RES_API_TOKEN', 'env-tok');
    mockFetch(jsonResponse({ error: 'not found' }, 404));
    const out = await cityMarketHandler(
      new Request('https://room.aireon.ch/api/city-market?city=Nowhere'),
    );
    expect(out.status).toBe(404);
    expect(await out.json()).toEqual({ error: 'not found' });
  });
});

describe('zone-stats handler (schema-gap raw proxy, Node signature)', () => {
  interface Sent {
    status?: number;
    body?: unknown;
    headers: Record<string, string>;
  }
  function nodeRes(): { res: never; sent: Sent } {
    const sent: Sent = { headers: {} };
    const res = {
      setHeader(name: string, value: string) {
        sent.headers[name] = value;
      },
      status(code: number) {
        sent.status = code;
        return res;
      },
      json(body: unknown) {
        sent.body = body;
      },
      send(body: unknown) {
        sent.body = body;
      },
      end() {},
    };
    return { res: res as never, sent };
  }

  it('POSTs the validated body to the shared-base URL with the suite token', async () => {
    const req = mockFetch(jsonResponse({ stats: [] }));
    const { res, sent } = nodeRes();
    await zoneStatsHandler(
      { method: 'POST', body: { fso: 261, cz_local: 'W2', lang: 'de' } } as never,
      res,
    );
    expect(req().url).toBe(`${RES_API_BASE_URL}/res_api/zone_stats`);
    expect(req().method).toBe('POST');
    expect(req().headers.get('token')).toBeTruthy();
    expect(await req().text()).toBe(JSON.stringify({ fso: 261, cz_local: 'W2', lang: 'de' }));
    expect(sent.status).toBe(200);
  });

  it('rejects a body without fso locally, without calling RES', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const { res, sent } = nodeRes();
    await zoneStatsHandler({ method: 'POST', body: { cz_local: 'W2' } } as never, res);
    expect(sent.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
