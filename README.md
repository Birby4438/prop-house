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

## Notes

- The HenrikDev API key and Firebase config in `index.html` are intentionally client-visible (free tier, low stakes). Firebase database rules are open read/write — fine for a casual friend group, not for anything sensitive.
