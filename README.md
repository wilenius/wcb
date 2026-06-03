# World Cup 2026 betting pool

A tiny betting site for a group of friends. Each person gets a one-time access key,
fills in a prediction form, and submits. All picks stay hidden until the deadline, then
everyone's bets are published and a live leaderboard ranks them. Results (who advanced,
the champion, goal tallies) are entered by the admin after each round.

- **Frontend:** plain static HTML/CSS/JS (no build step) in `public/`
- **Backend:** Cloudflare Pages Functions in `functions/`
- **Storage:** one Cloudflare KV namespace (`WCB`)
- Hosts on Cloudflare Pages' free tier.

## Scoring

| Pick | Points |
|------|--------|
| Each team that reaches the Round of 32 | 4 |
| Each team that reaches the Round of 16 | 8 |
| Each team that reaches the Quarter-finals | 15 |
| Each team that reaches the Semi-finals | 25 |
| Each of the two finalists | 35 |
| World champion | 50 |
| Each of 3 goalscorers | 6 × goals they score (shootout goals excluded) |

The form is a funnel: pick 32 of 48 teams, then narrow to 16 → 8 → 4 → 2 → champion.
Each round is still scored independently against the real results.

## Project layout

```
public/            static site (served as-is)
  index.html       the bet form
  bets.html        all bets (after deadline)
  leaderboard.html live table (after deadline)
  admin.html       admin tools (key gen, results)
  js/ css/ data/
functions/api/     Pages Functions (the API)
scripts/prepare-data.mjs   CSV -> public/data/*.json
wc2026_squads.csv  source squad list (country,position,player)
```

## Local development

```bash
npm install
npm run data            # regenerate public/data/*.json from the CSV
cp .dev.vars.example .dev.vars   # set ADMIN_KEY (and API_FOOTBALL_KEY if you have one)
npm run dev             # wrangler pages dev on http://localhost:8788
npm test                # scoring unit tests
```

`wrangler pages dev` uses a local simulated KV (data lives under `.wrangler/`, gitignored).
To test the *published* state locally, add a past `DEADLINE` to `.dev.vars`, e.g.
`DEADLINE=2020-01-01T00:00:00Z`, and restart.

## Configuration

Set in `wrangler.toml` (`[vars]`, safe to commit):

- `DEADLINE` — ISO instant when submissions lock. Default `2026-06-11T13:00:00Z`
  (= 2026-06-11 16:00 Europe/Helsinki).
- `API_FOOTBALL_LEAGUE` / `API_FOOTBALL_SEASON` — default `1` / `2026`.

Secret (never commit; `.dev.vars` locally, dashboard/CLI in production):

- `ADMIN_KEY` — protects `/api/admin/*` and the admin page.

## Deploy to Cloudflare Pages

```bash
# 1. Create the KV namespace and copy its id into wrangler.toml
npx wrangler kv namespace create WCB

# 2. Deploy the static site + functions
npx wrangler pages deploy public

# 3. Set the admin secret on the Pages project
npx wrangler pages secret put ADMIN_KEY
```

You can also connect the GitHub repo in the Cloudflare dashboard (Pages → Create →
Connect to Git): set the build output directory to `public`, bind the `WCB` KV namespace,
and add the env vars/secrets there. The `functions/` directory is picked up automatically.

## Running the pool

1. Open `/admin`, sign in with `ADMIN_KEY`.
2. Under **Access keys**, paste one name per line and **Generate keys**. Hand each
   person their key. The table shows who has submitted.
3. Friends go to `/`, enter their name + key, fill the funnel + 3 goalscorers, and submit
   (one submission per key, no edits).
4. After the deadline, `/bets` and `/leaderboard` open automatically.
5. **Results:** in the admin **Results** panel, after each round enter the teams that
   advanced (one per line per stage), the champion, and goal tallies (one
   `Country|Player = goals` per line, using the exact names from the player list). The
   leaderboard recomputes immediately. Update it as the tournament progresses.

### Why results are entered manually

There is no free/affordable live data feed that covers the 2026 tournament: API-Football's
plan excludes the 2026 season, and balldontlie's FIFA data endpoints (matches, rosters,
goals) require its top "GOAT" tier. So results are entered by hand in admin. If you later
get a data plan that covers 2026, the results model (`functions/_lib/results.js` +
`/api/admin/results`) is a clean place to add an importer.
