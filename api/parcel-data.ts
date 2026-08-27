// Vercel Edge Function: /api/parcel-data
//
// Proxies parcel lookups to the RES API's `parcel_data` endpoint, injecting
// the RES token server-side so it never reaches the browser. Mirrors the
// signal-collect proxy. room's ZoneInfoPanel + MapView call this.
//
// Also the carrier for room's queued usage signals: this is the request the app
// already makes when a parcel is selected, which is the same interaction that
// emits a signal, so the batch rides along and adds no request of its own.
// `withSignalCarrierWeb` drains the `X-Aireon-Ctx` request header, forwards each
// signal to RES and acknowledges the count on the response. This proxy's own
// request and response are untouched apart from that one added header.
//
// It is the Web/Edge variant because this is a `(Request) => Response` handler.
// That path acknowledges ONLY when it resolves a `waitUntil` from the runtime
// (@aireon/shared v1.193.0+), so a runtime that cannot keep the invocation alive
// past the response degrades to "unwrapped" instead of acking a batch it would
// then drop. See aireon-shared/docs/SIGNAL_STANDARD.md.
//
// ⚠ This response deliberately sets NO cacheable Cache-Control. A cached
// response would replay a stale ack header and destroy a batch that was never
// forwarded, so a carrier endpoint must never be edge-cached.

export const config = {
  runtime: "edge",
};

import { withSignalCarrierWeb } from "@aireon/shared/signal-carrier";
import { RES_API_BASE_URL } from "@aireon/shared/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// POST /res_api/parcel_data IS covered by the shared OpenAPI contract, but
// this proxy's PARCEL_API_URL env var overrides the FULL upstream URL (host
// AND path) — a shape a path-typed client cannot express — so the fetch
// stays raw and only the default derives from the shared base constant.
const DEFAULT_PARCEL_API_URL = `${RES_API_BASE_URL}/res_api/parcel_data`;

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

async function parcelData(req: Request): Promise<Response> {
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

export default withSignalCarrierWeb(parcelData);
