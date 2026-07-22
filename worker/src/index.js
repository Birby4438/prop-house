export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const url = new URL(req.url);
    if (!url.pathname.startsWith("/valorant/")) {
      return cors(new Response("Not found", { status: 404 }));
    }

    const upstream = "https://api.henrikdev.xyz" + url.pathname + url.search;
    const res = await fetch(upstream, {
      headers: { Authorization: env.HENRIK_KEY },
    });
    const body = await res.text();
    return cors(new Response(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    }));
  },
};

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return res;
}
