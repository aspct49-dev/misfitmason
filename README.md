# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. A $750 bi-weekly
Roobet wager leaderboard ranked on weighted wager, and 100% of affiliate revenue
returned to players, claimed through a form that posts into Discord.

**Periods are half-months**, both ends at 00:00 UTC: the 1st to the 15th, and the
16th to the last day of the month. `currentPeriod()` in `src/lib/format.ts` is
the only place that is decided.

Partner history, newest first: **Roobet** since 2026-10-08 (back after Shuffle
and Lootbox). Lootbox and its free-battles section went with that switch, and
Shuffle before it — `git log` has both if either returns.

Design spec: [DESIGN_LOCK.md](DESIGN_LOCK.md).

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

`.env` holds the partner credentials (gitignored — see `.env.example`):

```
ROOBET_API_TOKEN=<affiliate JWT>
DISCORD_CLAIM_WEBHOOK_URL=<webhook the claim form posts into>
CLAIM_SECRET=<any long random string>
```

The Roobet JWT *is* the whole credential: the affiliate id is the `id` claim
inside it, so there is nothing else to configure and nothing to keep in sync.

`DISCORD_CLAIM_WEBHOOK_URL` is server-side only and must never become a
`NEXT_PUBLIC_` variable — anyone holding that URL can post into the channel as
the bot. `CLAIM_SECRET` signs the 24-hour cooldown cookie; changing it clears
every outstanding cooldown.

## Deploying to Vercel

1. Import the repo. Vercel detects Next.js; no build settings to change.
2. Add these under Settings → Environment Variables, for Production, Preview and
   Development:
   - **`ROOBET_API_TOKEN`**, **`DISCORD_CLAIM_WEBHOOK_URL`** and **`CLAIM_SECRET`**.
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
`[leaderboard] roobet provider failed: …` in the build log is the tell.

Because pages are prerendered, a failure *at build time* is cached until the
first request revalidates it — which is why a transient rate-limit during a
build can leave the notice on screen for a minute after the API has recovered.

Pages using live data are statically generated with `revalidate = 60`, so
standings refresh about once a minute without a rebuild.

**Rotate the Roobet token and the Discord webhook before launch.** Both have been
through a chat window.

### Roobet API

`GET https://roobetconnect.com/affiliate/v2/stats?userId=<id>&startDate=&endDate=`,
bearer auth with the JWT. Two things the code depends on:

- **`endDate` is exclusive.** It means "up to 00:00 on this date", so the bound
  sent is the day *after* the period ends. Sending the last day itself drops
  that whole day's wagering — silently, on the day the board settles.
- **It returns `wagered` and `weightedWagered`.** The board ranks, displays and
  totals the weighted figure; see the decisions below.

The board is **$750 per period, paid $300 / $200 / $125 / $75 / $50** to the top
five.

### Affiliate-revenue claims

`POST /api/claim` takes a Roobet username, a Discord handle and an optional
note, and posts an embed to `DISCORD_CLAIM_WEBHOOK_URL`. There is no database:
the Discord channel is the claim record.

- Every field is stripped of Discord formatting and mention syntax, and the
  message sets `allowed_mentions: { parse: [] }`, so nothing a stranger types
  can ping the server.
- A 24-hour cooldown rides in an HMAC-signed cookie. Signed so an expiry cannot
  be forged, but a cleared cookie clears the cooldown — it throttles honest
  repeats, it does not stop a determined submitter. Making it authoritative
  needs a datastore keyed on the player.
- A small per-instance IP throttle sits in front of it. Serverless runs several
  instances, so treat it as a speed bump, not a limit.

### Excluded accounts

`src/lib/staff.ts` holds the usernames that never appear on a board. They are
dropped before ranking *and* before the whole-board stats, so staff play does
not inflate the totals either. Matching is case-insensitive.

## Architecture

```
src/lib/types.ts            domain shapes; no React, no fetch
src/lib/partners.ts         prize pools, splits, codes, links — the only place they live
src/lib/format.ts           masking + money/period formatting
src/lib/providers/roobet    live API, server-only
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
  every month. Roobet's API takes a real date range, so the board resets by
  itself with no snapshot or cron.
- **Ranked on weighted wager** (client decision, 2026-10-08). Roobet discounts
  each bet by the game's RTP — full value up to 97%, half to 98.99%, a tenth
  above that — and that weighted figure is what is ranked, shown and totalled.
  Every label reads "Weighted" and the bands are published under the table,
  because a weighted number under a plain "Wagered" heading reads as an error to
  anyone comparing it with their own Roobet statistics.
- **Every paying seat always renders**, and so does every player below them.
  The affiliate base is genuinely small, so unfilled positions show as an open
  place with the prize still attached rather than being hidden; players outside
  the money are listed with an em dash in the prize column, so someone in 7th
  can see the gap to 3rd. Accounts with a zero total for the period are dropped
  — they are registrations, not standings.
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

The referral link and code are real: `https://roobet.com/?ref=kickmisfitmason`
(`kickmisfitmason`) — carried over from the site's first Roobet run, so confirm
it is still the right link before launch.
