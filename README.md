# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. A $500 bi-weekly
Lootbox wager leaderboard, 100% affiliate revenue return, free Lootbox battles.

**Periods are half-months**, both ends at 00:00 UTC: the 1st to the 15th, and the
16th to the last day of the month. `currentPeriod()` in `src/lib/format.ts` is
the only place that is decided.

Shuffle was removed on 2026-10-01 (client decision: no Shuffle board this
month). Its provider, baseline script and logo went with it — `git show
ebfbe3a` has the last version if it comes back.

Design spec: [DESIGN_LOCK.md](DESIGN_LOCK.md).

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

`.env` holds the partner credentials (gitignored — see `.env.example`):

```
LOOTBOX_API_URL=https://partners.lootbox.com
LOOTBOX_API_KEY=partner<...>
```

## Deploying to Vercel

1. Import the repo. Vercel detects Next.js; no build settings to change.
2. Add these under Settings → Environment Variables, for Production, Preview and
   Development:
   - **`LOOTBOX_API_URL`** and **`LOOTBOX_API_KEY`**.
   - **`NEXT_PUBLIC_SITE_URL`** — the canonical origin, e.g.
     `https://misfitmason.com`. Optional: without it the site falls back to
     Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`, so deploys are correct out of
     the box and this only matters once a custom domain is attached.
3. Redeploy.

`robots.txt` and `sitemap.xml` are **statically generated**, so the origin is
baked in at *build* time, not read per request. Changing the domain therefore
needs a redeploy, not just an env var edit.

The build does **not** fail without the credentials — the provider throws, the
service catches it, and the board renders every place unclaimed under a
"temporarily unavailable" notice. That is deliberate so a first deploy succeeds
before the variables are set, but it also means a missing or revoked credential
shows as an empty board rather than as an error.
`[leaderboard] lootbox provider failed: …` in the build log is the tell.

Because pages are prerendered, a failure *at build time* is cached until the
first request revalidates it — which is why a transient rate-limit during a
build can leave the notice on screen for a minute after the API has recovered.

Pages using live data are statically generated with `revalidate = 60`, so
standings refresh about once a minute without a rebuild.

**Rotate the Lootbox key before launch.** It has been through a chat window.

### Lootbox API

`POST {LOOTBOX_API_URL}/top-affiliate-wagers-by-period`, bearer auth. It takes a
real time range, so the board matches the half-month period the site advertises
and resets on its own. Docs: <https://docs.lootbox.com/>.

Two shape details the code depends on:

- timestamps are Unix **seconds**, not milliseconds;
- `totalWagered` comes back as a **string** — summing it unparsed would
  concatenate rather than add.

It also returns per-player `avatar` URLs, which the board uses in place of a
tier badge.

It is the only board. **$500 per period, paid $250 / $150 / $100** to the top
three — the 50/30/20 split the site has always used.

### Excluded accounts

`src/lib/staff.ts` holds the usernames that never appear on a board. They are
dropped before ranking *and* before the whole-board stats, so staff play does
not inflate the totals either. Matching is case-insensitive.

## Architecture

```
src/lib/types.ts            domain shapes; no React, no fetch
src/lib/partners.ts         prize pools, splits, codes, links — the only place they live
src/lib/format.ts           masking + money/period formatting
src/lib/providers/lootbox   live API, server-only
src/lib/providers/shared    fills a prize table to N seats, marking empties unclaimed
src/lib/services/leaderboard the only entry point the UI calls
src/lib/staff.ts            accounts excluded from every board
src/app/api/leaderboard/    JSON proxy (OBS overlays, bots) — token never leaves the server
src/components/             presentational, take data as props
```

The UI never imports a provider, so which casino is live stays an implementation
detail. Components read `board.source` to decide whether to show the sample-data
notice.

### Adding another casino

Add an entry to `PARTNERS` and `PARTNER_ORDER`, add a `PartnerId`, write a
provider implementing `LeaderboardProvider`, register it in
`src/lib/services/leaderboard.ts`. The tabs, podium, rules and partner cards all
render from the registry.

## Decisions worth knowing

- **Half-month periods** (client decision, 2026-10-01), not rolling fortnights,
  so a period never straddles a month boundary and the reset dates are the same
  every month. Lootbox's API takes a real date range, so the board resets by
  itself with no snapshot or cron.
- **Ranked on raw wagered.** Lootbox returns only `totalWagered`, so there is
  nothing to weight. The `weighted` flag on a partner still drives the labels
  and the weighting disclaimer, for an operator that does report it.
- **Every paying seat always renders.** The affiliate base is genuinely small,
  so unfilled positions show as an open place with the prize still attached
  rather than being hidden.
- **`comingSoon` on a partner** swaps its board for a coming-soon panel and hides
  its split everywhere, for a board that is announced but not open.
- **A failed live call renders no players**, not fixtures. A hardcoded row shows
  as a real player with a real-looking figure, so a transient outage would
  present frozen standings as though they were current. Every place comes back
  unclaimed under the "temporarily unavailable" notice instead.
- **No activity ticker, no member counts.** Nothing on the site implies a crowd
  that does not exist.
- **No gold, no green.** Every colour is sampled from the mascot artwork.

## Placeholders

| What | Where |
|---|---|
| Wordmark (mascot mark + type) | `src/components/Shell.tsx` |
| Lootbox free-battle rules | `FREE_BATTLES` in `src/lib/partners.ts` |
| Discord invite | `SOCIALS` in `src/lib/partners.ts` |
| Kick live state (hardcoded offline) | `LiveChip` in `src/components/Shell.tsx` |
| Legal copy | `src/app/legal/page.tsx` — drafted, not legal advice |

## Asset pipeline

`node scripts/process-assets.mjs` regenerates everything in `public/` from the
source art in the repo root — the lodge backdrop, the light shaft, the table
edge, the five drifting props, the four tiles, the banner frames, the rank
emblems and the page texture. Sources are committed alongside the outputs, so
the pipeline is reproducible from a fresh clone.

The one input that is **not** committed is `header.png` — Gumbo's own artwork,
kept locally as a visual reference only and never shipped.

Icons (`src/app/icon.png`, `src/app/apple-icon.png`, `public/favicon.ico`) come
out of the same script, composited onto an opaque ground — the mascot art is
transparent and would vanish in a light browser tab strip.

`public/og.png` is the exception: it is a screenshot of
[`scripts/og-card.html`](scripts/og-card.html) at 1200x630. Kept as HTML so the
card uses the site's real typeface; re-render it with any headless browser after
editing that file.

## SEO

- Per-page `title`, `description` and `canonical`, with a shared title template.
- Open Graph and Twitter `summary_large_image` cards on every page.
- `Organization` + `WebSite` JSON-LD in one graph, cross-referenced by `@id` so
  the social profiles attach to the site rather than floating free.
- `robots.txt` allows everything except `/api/`, which serves the JSON proxy for
  overlays and bots rather than anything a search result should point at.
- `sitemap.xml` generated from `ROUTES` in `src/lib/site.ts`.

The referral link and code are real: `https://lootbox.com/r/misfitmason`
(`misfitmason`).
