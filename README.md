# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. Two bi-weekly
wager leaderboards — **$750 on Roobet**, ranked on weighted wager, and **$500 on
Lootbox** for case battles — plus 100% of affiliate revenue returned to players,
claimed through a form that posts into Discord.

Roobet is the main board: first in `PARTNER_ORDER`, so it is the default tab and
the one the home page previews.

**Periods are half-months**, both ends at 00:00 UTC: the 1st to the 15th, and the
16th to the last day of the month. `currentPeriod()` in `src/lib/format.ts` is
the only place that is decided.

Partner history: **Roobet** returned 2026-10-08 after a Shuffle and then a
Lootbox run; **Lootbox** came back alongside it the same day, with its
free-battles section. Shuffle is gone — `git log` has it if it returns.

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
LOOTBOX_API_URL=https://partners.lootbox.com
LOOTBOX_API_KEY=partner<...>
DISCORD_CLAIM_WEBHOOK_URL=<webhook the claim form posts into>
CLAIM_SECRET=<any long random string>
DISCORD_CLIENT_ID=<OAuth app id>
DISCORD_CLIENT_SECRET=<OAuth app secret>
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
   - **`ROOBET_API_TOKEN`**, **`LOOTBOX_API_URL`**, **`LOOTBOX_API_KEY`**,
     **`DISCORD_CLAIM_WEBHOOK_URL`**, **`CLAIM_SECRET`**, **`DISCORD_CLIENT_ID`**
     and **`DISCORD_CLIENT_SECRET`**.
   - **`NEXT_PUBLIC_SITE_URL`** — the canonical origin, e.g.
     `https://www.misfitmason.com` — the host Vercel actually serves, since the
     apex redirects to it. Optional: without it the site falls back to
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

**Rotate the Roobet token, the Lootbox key, the Discord webhook and the Discord
client secret before launch.** All four have been through a chat window.

### Roobet API

`GET https://roobetconnect.com/affiliate/v2/stats?userId=<id>&startDate=&endDate=`,
bearer auth with the JWT. Two things the code depends on:

- **`endDate` is exclusive.** It means "up to 00:00 on this date", so the bound
  sent is the day *after* the period ends. Sending the last day itself drops
  that whole day's wagering — silently, on the day the board settles.
- **It returns `wagered` and `weightedWagered`.** The board ranks, displays and
  totals the weighted figure; see the decisions below.

The Roobet board is **$750 per period, paid $300 / $200 / $125 / $75 / $50** to
the top five.

### Lootbox API

`POST {LOOTBOX_API_URL}/top-affiliate-wagers-by-period`, bearer auth. It takes a
real date range, so the board matches the half-month period the site advertises
and resets on its own. Docs: <https://docs.lootbox.com/>.

Two shape details the code depends on:

- timestamps are Unix **seconds**, not milliseconds;
- `totalWagered` comes back as a **string** — summing it unparsed would
  concatenate rather than add.

It returns only the raw figure, so this board cannot be weighted; the `weighted`
flag on the partner is what keeps its labels reading "Wagered" while Roobet's
read "Weighted". It is **$500 per period, paid $225 / $125 / $75 / $50 / $25**,
and depositors also get free battles (rules still provisional).

### Affiliate-revenue claims

Sign in with Discord, then `POST /api/claim` with a Roobet username and an
optional note; the route posts an embed to `DISCORD_CLAIM_WEBHOOK_URL`. There is
no database: the Discord channel is the claim record.

**Discord OAuth.** `identify` scope only — the claim needs an account to
attribute and a name to show, nothing more. Register the callback for **every
origin the site is served from**, exactly:

```
http://localhost:3000/api/auth/discord/callback
https://www.misfitmason.com/api/auth/discord/callback
```

**`www`, not the bare domain.** Vercel serves this site on
`www.misfitmason.com` and 308-redirects the apex to it, so `www` is the origin
the browser is on when it comes back from Discord. Localhost must be `http`:
Discord requires HTTPS for every redirect except localhost, and rejects
`https://localhost` as invalid.

`redirectUri()` in `src/lib/session.ts` builds that string from
`NEXT_PUBLIC_SITE_URL`, except on localhost, which always keeps its own origin
so a developer signing in locally is not bounced to production. Discord compares
it character for character — a trailing slash or the wrong scheme is a
`redirect_uri` mismatch, not a soft failure. With
`NEXT_PUBLIC_SITE_URL` set in production, Vercel preview deployments send their
sign-ins to the production origin, so preview sign-in works without registering
every preview URL.

Anti-spam, weakest to strongest:

- A small per-instance IP throttle. Serverless runs several instances, so treat
  it as a speed bump, not a limit.
- A 24-hour cooldown in an HMAC-signed cookie, keyed to the Discord account id.
  Signed, so an expiry cannot be forged; cookie-based, so clearing cookies
  clears it. Making it authoritative needs a datastore keyed on the player.
- **Discord sign-in**, which is the one that matters: a second claim inside the
  window needs a second Discord account.

Every field is stripped of Discord formatting and mention syntax, and the
message sets `allowed_mentions: { parse: [] }`, so nothing a stranger types can
ping the server. Discord blocks posts from unfamiliar user agents, so both the
webhook call and the OAuth calls send an explicit one — a bare default gets a
403 with no useful body.

### VIP transfer applications

`POST /api/vip-transfer`, multipart, to the **same webhook as the claims**. An
applicant holding a VIP level at another casino sends their username, where they
play now, their lossback tier, and screenshots of their last 30 days and
lifetime wagered; a person reads it in Discord and Roobet decides the tier.

Nothing is stored — the images stream to Discord as attachments and the request
ends. Holding other people's account screenshots would serve nothing, since the
only thing anyone does with an application is read it and reply.

Sign-in is optional here, unlike the claim form: someone arriving from a stream
with a level elsewhere is exactly who this is for, and an account would be a
step between them and the thing they came to do. Signing in only saves typing,
and gives a handle they cannot mistype.

Checks, in order: a honeypot field (answered with the ordinary success shape, so
a bot goes away rather than trying something else), a per-address burst limit of
five in fifteen minutes, field validation, file type and size, the **actual
first bytes of every file** — a browser reports whatever content type it likes —
and only then a 24-hour signed-cookie cooldown, checked last so a rejected
submission does not spend someone's allowance.

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
  every month. Both APIs take a real date range, so the boards reset by
  themselves with no snapshot or cron.
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

The referral link and code are real: `https://roobet.com/?ref=kickmisfitmason`
(`kickmisfitmason`) — carried over from the site's first Roobet run, so confirm
it is still the right link before launch.
