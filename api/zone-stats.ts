// Vercel Node serverless function: /api/zone-stats
//
// Proxies zone aggregate lookups to the RES API's `zone_stats` endpoint,
// injecting the RES token server-side. Runs on the Node runtime (NOT
// edge) because RES's first call for an unseen (fso, cz_local) can take
// ~45s for the SQL aggregate — well beyond the Edge runtime's ~25s
// wall-time. Subsequent calls hit RES's LRU and return in ~1s.
//
// IMPORTANT: Node functions must use the (req, res) handler signature.
// The Web (Request)=>Response signature only works on the edge runtime
// — using it under runtime: "nodejs" makes the function hang until it
// hits maxDuration. See api/claire-pois.ts for the canonical pattern.

export const config = { maxDuration: 60 };

const RES_ZONE_STATS_URL =
  "https://res.zeroo.ch/res_api/zone_stats";
// Token hardcoded for the same reason as claire-pois.ts: a stale
// team-level RES_API_TOKEN env var on Vercel would override and break this.
const RES_API_TOKEN = "DNfbHaqajFigz4jPX9B8vnatUduLKZXVwA83WKZG";
// Wait up to 55s for RES; leaves headroom under the 60s function cap.
const UPSTREAM_TIMEOUT_MS = 55000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface NodeReq {
  method?: string;
  body?: unknown;
}
interface NodeRes {
  setHeader(name: string, value: string): void;
  status(code: number): NodeRes;
  json(body: unknown): void;
  send(body: unknown): void;
  end(): void;
}

function send(res: NodeRes, status: number, body: unknown): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(body);
}

export default async function handler(
  req: NodeReq,
  res: NodeRes,
): Promise<void> {
  if (req.method === "OPTIONS") {
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  let body: { fso?: unknown; cz_local?: unknown; lang?: unknown } | undefined;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch {
      send(res, 400, { error: "Invalid JSON body" });
      return;
    }
  } else {
    body = req.body as typeof body;
  }

  const fso = typeof body?.fso === "number" ? body.fso : Number(body?.fso);
  const cz_local = typeof body?.cz_local === "string" ? body.cz_local : "";
  const lang = typeof body?.lang === "string" ? body.lang : "en";
  if (!Number.isFinite(fso)) {
    send(res, 400, { error: "Body must include numeric fso" });
    return;
  }
  if (!cz_local) {
    send(res, 400, { error: "Body must include cz_local (string)" });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(RES_ZONE_STATS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: RES_API_TOKEN,
      },
      body: JSON.stringify({ fso, cz_local, lang }),
      signal: controller.signal,
    });
    const text = await upstream.text();
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
    res.setHeader("Content-Type", "application/json");
    res.status(upstream.status).send(text);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    send(res, 502, { error: "RES /zone_stats unreachable", details: msg });
  } finally {
    clearTimeout(timer);
  }
}
