# PropHouse

A friend-group Valorant prop betting board — pick Over/Under lines on kills, deaths, ACS, etc., pulled live from real match stats via the [HenrikDev API](https://api.henrikdev.xyz), build a slip, and settle up.

Single static HTML file, no build step. Roster, lines, tickets, and standings sync live across everyone visiting the site via Firebase Realtime Database, so the whole group sees the same board.

## Play

Open the GitHub Pages URL for this repo — no setup needed, the API key and shared database are already wired in.

## Local dev

Just open `index.html` in a browser, or serve it:

```
python3 -m http.server 8000
```

## Architecture

- `index.html` — the app. Calls the HenrikDev API through a proxy (see below) and reads/writes shared state via Firebase Realtime Database.
- `worker/` — a Cloudflare Worker that proxies requests to the HenrikDev API, attaching the real API key server-side so it's never shipped to the browser. Deployed with `wrangler deploy` from inside `worker/`; the key itself is stored as an encrypted Cloudflare secret (`wrangler secret put HENRIK_KEY`), not in this repo.

## Notes

- The Firebase config in `index.html` is a public client config (safe by design — Firebase security comes from database rules, not secrecy). Rules are open read/write, which is fine for a casual friend group but not for anything sensitive.
