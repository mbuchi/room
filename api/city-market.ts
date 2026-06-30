// Vercel Edge Function: /api/city-market
//
// Proxies city-level market lookups to the RES API's `city-market/by-parcel`
// endpoint, injecting the RES token server-side so it never reaches the
// browser. Mirrors api/parcel-data.ts (which itself mirrors the signal-collect
// proxy). room's MarketDataSection (via cityMarketService) calls this.
//
// Unlike parcel-data this is a GET: the caller passes the BFS number plus the
// city/canton fallbacks as query params, and we forward them verbatim. The
// upstream JSON and status (including 404 when RES has no row for the city)
// are passed straight through so the client can degrade to "no data".

export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_CITY_MARKET_API_URL =
  "https://res.zeroo.ch/res_api/city-market/by-parcel";

function readEnv(...names: string[]): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (env) {
    for (const name of names) {
      const value = env[name];
      if (value) return value;
    }
  }
  const denoEnv = (globalThis as { Deno?: { env?: { get(name: string): string | undefined } } }).Deno?.env;
  if (denoEnv) {
    for (const name of names) {
      const value = denoEnv.get(name);
      if (value) return value;
    }
  }
  return undefined;
}

const CITY_MARKET_API_URL =
  readEnv("CITY_MARKET_API_URL") ?? DEFAULT_CITY_MARKET_API_URL;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = readEnv("RES_API_TOKEN");
  if (!token) {
    return json({ error: "RES_API_TOKEN not configured" }, 500);
  }

  const incoming = new URL(req.url);
  const bfs = incoming.searchParams.get("bfs");
  const city = incoming.searchParams.get("city");
  const canton = incoming.searchParams.get("canton");

  // At least one resolver is required — without bfs and without city RES can't
  // match a row, so reject early rather than burning an upstream round-trip.
  if (!bfs && !city) {
    return json({ error: "Query must include bfs or city" }, 400);
  }

  // Forward only the params that were actually supplied so the upstream match
  // logic sees a clean query (mirrors how parcel-data forwards null-safe).
  const upstreamUrl = new URL(CITY_MARKET_API_URL);
  if (bfs) upstreamUrl.searchParams.set("bfs", bfs);
  if (city) upstreamUrl.searchParams.set("city", city);
  if (canton) upstreamUrl.searchParams.set("canton", canton);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: { token, "X-RES-API-Version": "2" },
    });
    const text = await upstream.text();
    return new Response(text, {
      // Pass the status through unchanged, including 404 (no data for city).
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 502);
  }
}
