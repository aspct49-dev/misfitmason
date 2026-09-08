# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. Shuffle and Lootbox
standings, 100% affiliate revenue return, free Lootbox battles.

Design spec: [DESIGN_LOCK.md](DESIGN_LOCK.md).

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

`.env` holds the partner credentials (gitignored — see `.env.example`):

```
SHUFFLE_WAGER_URL=https://affiliate.shuffle.com/wager/<uuid>
LOOTBOX_API_URL=https://partners.lootbox.com
LOOTBOX_API_KEY=partner<...>
```

The Shuffle UUID *is* the credential — there is no separate token, so treat the
whole URL as a secret.

## Deploying to Vercel

1. Import the repo. Vercel detects Next.js; no build settings to change.
2. Add these under Settings → Environment Variables, for Production, Preview and
   Development:
   - **`SHUFFLE_WAGER_URL`** — the full affiliate wager endpoint.
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
`[leaderboard] shuffle provider failed: …` in the build log is the tell.

Because pages are prerendered, a failure *at build time* is cached until the
first request revalidates it — which is why a transient rate-limit during a
build can leave the notice on screen for a minute after the API has recovered.

Pages using live data are statically generated with `revalidate = 60`, so
standings refresh about once a minute without a rebuild.

**Rotate both credentials before launch.** They have been through a chat window.

### Shuffle API constraints

- **No parameters.** Any date range returns HTTP 500, so the reporting window is
  whatever Shuffle has configured. The `period` we pass is used only for the
  labels and the countdown; it cannot filter the data. If Shuffle's window is not
  the calendar month, the countdown on the page will not match their reset.
- **Rate limited.** A handful of rapid calls returns `TOO_MANY_REQUEST`. The
  60-second `revalidate` is what keeps us under it — do not lower it.
- Returns `{ username, wagerAmount, weightedWagerAmount }` and nothing else: no
  avatars, favourite games or biggest-multiplier data, so those panels do not
  appear on this board.

### Lootbox API

`POST {LOOTBOX_API_URL}/top-affiliate-wagers-by-period`, bearer auth. Unlike
Shuffle it takes a real time range, so the board matches the calendar period the
site advertises. Docs: <https://docs.lootbox.com/>.

Two shape details the code depends on:

- timestamps are Unix **seconds**, not milliseconds;
- `totalWagered` comes back as a **string** — summing it unparsed would
  concatenate rather than add.

It also returns per-player `avatar` URLs, which the board uses in place of a
tier badge.

The board is wired and returning live data, but the partner is still flagged
`comingSoon: true` so the UI shows the coming-soon panel. Flip that flag once
the prize split is decided — `prizeTable` currently holds a provisional
`[100, 60, 40]` that is deliberately never displayed.

### Excluded accounts

`src/lib/staff.ts` holds the usernames that never appear on a board. They are
dropped before ranking *and* before the whole-board stats, so staff play does
not inflate the totals either. Matching is case-insensitive.

## Architecture

```
src/lib/types.ts            domain shapes; no React, no fetch
src/lib/partners.ts         prize pools, splits, codes, links — the only place they live
src/lib/format.ts           masking + money/period formatting
src/lib/providers/shuffle   live API, server-only
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

### Opening the Lootbox board

Set the prize split in `PARTNERS.lootbox.prizeTable`, then flip `comingSoon` to
`false` and `hasLiveApi` to `true`. The provider is already live; nothing else
changes.

### Adding another casino

Add an entry to `PARTNERS` and `PARTNER_ORDER`, add a `PartnerId`, write a
provider implementing `LeaderboardProvider`, register it in
`src/lib/services/leaderboard.ts`. The tabs, podium, rules and partner cards all
render from the registry.

## Decisions worth knowing

- **Ranked on raw wagered**, not the weighted figure (client decision,
  2026-09-05). Shuffle returns both; the weighted one discounts low-house-edge
  play. Raw ranking is farmable on those games, which is why the rules carry an
  explicit no-wager-abuse clause.
- **Every paying seat always renders.** Shuffle pays three ($125 / $75 / $50); the
  affiliate base is genuinely small, so unfilled positions show as an open place
  with the prize still attached rather than being hidden.
- **Lootbox is `comingSoon`.** Its board renders a coming-soon panel instead of
  standings, and its split is deliberately unpublished — the provisional array in
  `partners.ts` is not shown anywhere until it is announced.
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

Referral links and codes are real: `https://shuffle.com/?r=MisfitMason`
(`MisfitMason`) and `https://lootbox.com/r/misfitmason` (`misfitmason`). The
Shuffle *API* URL is a separate credential and is not a signup link.
