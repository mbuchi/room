// Vercel Edge Function: /api/zone-stats
//
// Proxies zone aggregate lookups to the RES API's `zone_stats` endpoint
// (added for room in project_RES v1.3.0), injecting the RES token
// server-side so it never reaches the browser.

// Run on Node.js (not Edge): RES /zone_stats can take ~45s on the first
// (uncached) call for a previously-unseen (fso, cz_local) — well beyond
// the Edge runtime's ~25s wall-time. Subsequent calls hit RES's LRU and
// drop to ~1s, but the first user to query a zone must not get a 504.
export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_ZONE_STATS_URL = "https://res.zeroo.ch/res_api/zone_stats";

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

const ZONE_STATS_URL = readEnv("ZONE_STATS_API_URL") ?? DEFAULT_ZONE_STATS_URL;

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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = readEnv("RES_API_TOKEN");
  if (!token) {
    return json({ error: "RES_API_TOKEN not configured" }, 500);
  }

  let fso: unknown;
  let cz_local: unknown;
  let lang: unknown;
  try {
    const body = await req.json();
    fso = body?.fso;
    cz_local = body?.cz_local;
    lang = body?.lang;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (typeof fso !== "number" || !Number.isFinite(fso)) {
    return json({ error: "Body must include numeric fso" }, 400);
  }
  if (typeof cz_local !== "string" || !cz_local) {
    return json({ error: "Body must include cz_local (string)" }, 400);
  }

  try {
    const upstream = await fetch(ZONE_STATS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({
        fso,
        cz_local,
        lang: typeof lang === "string" ? lang : "en",
      }),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 502);
  }
}
