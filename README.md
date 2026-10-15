# PropHouse

A Valorant prop betting board for friend groups — pick More/Less lines on kills, deaths, Performance Score, etc., pulled live from real match stats via the [HenrikDev API](https://api.henrikdev.xyz), build a slip, and settle up.

Single static HTML file, no build step. Each friend group gets its own private board: roster, lines, tickets, and standings sync live between everyone in that group via Firebase Realtime Database.

## Play

Open the GitHub Pages URL for this repo and either **create a group** or paste an **invite link**. To bring friends in, open the group menu (the group name in the header) and copy the invite link.

- A group is identified by a long random code in the link (`…/#g=<code>`). The code lives in the URL fragment, which browsers never send to any server.
- Bets grade themselves: each one settles from the player's next full competitive game (13+ rounds) that starts after the bet was placed — for a combo, the next such game all its players are in. Whoever has the site open does the checking (on load, then every few minutes while the tab is visible); the Settle tab can still grade or correct anything by hand.
- Anyone with the link can see that group's roster and place bets — share it only with the group. There are no accounts; losing the link means losing access (each device remembers groups it has opened on the start screen).

## Local dev

Serve the folder (the start screen and invite links use the page's real URL):

```
python3 -m http.server 8000
```

## Architecture

- `index.html` — the app. Calls the HenrikDev API through a proxy (see below) and reads/writes the group's data under `groups/<code>/` in Firebase Realtime Database.
- `database.rules.json` — the Realtime Database security rules (see below).
- `worker/` — a Cloudflare Worker that proxies requests to the HenrikDev API, attaching the real API key server-side so it's never shipped to the browser. It only answers requests from the PropHouse site (and `localhost` for development), only forwards the match-history endpoint the app uses, limits each visitor to 40 requests a minute, and answers repeat requests within a minute from memory. Deployed with `npx wrangler deploy` from inside `worker/`; the key itself is stored as an encrypted Cloudflare secret (`npx wrangler secret put HENRIK_KEY`), not in this repo. If the site moves to a new address, add it to `ALLOWED_ORIGINS` in `worker/src/index.js` and redeploy.

## Database rules

`database.rules.json` is what keeps groups private. In short:

- Nobody can list groups or read anything outside `groups/<code>` — a group can only be opened with its code.
- Group codes must be 16–40 URL-safe characters (the app makes 20-character random ones).
- A group can't be wiped or replaced in one write, its `meta` (name + creation time) can't be deleted, unknown keys are rejected, and tickets must have the expected shape.
- The pre-groups board at `/prophouse` is locked; it stays in the database as a backup, visible only in the Firebase console.

To publish changes: Firebase console → Realtime Database → **Rules** → paste the file's contents → **Publish**.

## Notes

- The Firebase config in `index.html` is a public client config (safe by design — Firebase security comes from database rules, not secrecy).
- All groups share one HenrikDev API key through the proxy, so heavy use across many groups will hit HenrikDev's own rate limit sooner; the per-visitor limit and cache soften that, a higher-tier key fixes it.
