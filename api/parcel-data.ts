// Vercel Edge Function: /api/parcel-data
//
// Proxies parcel lookups to the RES API's `parcel_data` endpoint, injecting
// the RES token server-side so it never reaches the browser. Mirrors the
// signal-collect proxy. room's ZoneInfoPanel + MapView call this.

export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_PARCEL_API_URL = "https://res.zeroo.ch/res_api/parcel_data";

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

const PARCEL_API_URL = readEnv("PARCEL_API_URL") ?? DEFAULT_PARCEL_API_URL;

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

  let lat: unknown;
  let lng: unknown;
  let egrid: unknown;
  try {
    const body = await req.json();
    lat = body?.lat;
    lng = body?.lng;
    egrid = body?.egrid;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (
    typeof lat !== "number" || !Number.isFinite(lat) ||
    typeof lng !== "number" || !Number.isFinite(lng)
  ) {
    return json({ error: "Body must include numeric lat and lng" }, 400);
  }

  try {
    const upstream = await fetch(PARCEL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({
        lat,
        lng,
        egrid: typeof egrid === "string" ? egrid : null,
        structure: "default",
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
