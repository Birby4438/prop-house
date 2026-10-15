// Proxy in front of the HenrikDev API: attaches the real key server-side, and keeps the key from
// being used by anyone but the PropHouse site.
//  - only the site's own origin (and localhost for development) may call it
//  - only the match-history endpoint the app actually uses is forwarded
//  - each visitor (by IP) gets a per-minute budget, so one person can't drain the shared key
//  - identical requests within a minute are answered from memory instead of re-fetched
// The limit and cache live in this worker instance's memory: best-effort (each Cloudflare location
// keeps its own), which is plenty for stopping casual reuse and accidental hammering.

const ALLOWED_ORIGINS = ["https://birby4438.github.io"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const ALLOWED_PATH = /^\/valorant\/v4\/matches\/[a-z]+\/[a-z]+\/[^/]+\/[^/]+$/;   // /valorant/v4/matches/{region}/{platform}/{name}/{tag}

const RATE_LIMIT = 40;                 // requests per IP per window — a full-roster sync is ~15
const RATE_WINDOW_MS = 60_000;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_BYTES = 32 * 1024 * 1024;

const hits = new Map();                // ip -> {count, resetAt}
const cache = new Map();               // upstream url -> {body, status, type, expires, size}
let cacheBytes = 0;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
    if (!allowed) return json({ error: "This proxy only serves the PropHouse site" }, 403, null);

    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin);
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);

    const url = new URL(req.url);
    if (!ALLOWED_PATH.test(url.pathname)) return json({ error: "Not found" }, 404, origin);

    const ip = req.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || now >= h.resetAt) { h = { count: 0, resetAt: now + RATE_WINDOW_MS }; hits.set(ip, h); }
    if (++h.count > RATE_LIMIT) {
      const res = json({ error: "Rate limited — wait a minute and retry" }, 429, origin);
      res.headers.set("Retry-After", String(Math.ceil((h.resetAt - now) / 1000)));
      return res;
    }
    if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);   // keep the table small

    const upstream = "https://api.henrikdev.xyz" + url.pathname + url.search;
    const hit = cache.get(upstream);
    if (hit && hit.expires > now) return cors(new Response(hit.body, { status: hit.status, headers: { "content-type": hit.type, "x-proxy-cache": "hit" } }), origin);

    const res = await fetch(upstream, { headers: { Authorization: env.HENRIK_KEY } });
    const body = await res.text();
    const type = res.headers.get("content-type") || "application/json";
    if (res.status === 200) remember(upstream, { body, status: 200, type, expires: now + CACHE_TTL_MS, size: body.length });
    return cors(new Response(body, { status: res.status, headers: { "content-type": type, "x-proxy-cache": "miss" } }), origin);
  },
};

function remember(key, entry){
  if (entry.size > CACHE_MAX_BYTES / 4) return;   // never let one giant response crowd out everything else
  const old = cache.get(key); if (old) { cacheBytes -= old.size; cache.delete(key); }
  cache.set(key, entry); cacheBytes += entry.size;
  const now = Date.now();
  for (const [k, v] of cache) {                    // Map keeps insertion order, so this walks oldest first
    if (cacheBytes <= CACHE_MAX_BYTES && v.expires > now) break;
    cache.delete(k); cacheBytes -= v.size;
  }
}

function json(obj, status, origin){
  return cors(new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } }), origin);
}

function cors(res, origin) {
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
  res.headers.set("Vary", "Origin");
  return res;
}
