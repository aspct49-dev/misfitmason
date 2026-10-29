# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. The rewards
line-up (`REWARDS_LINEUP` in `src/lib/partners.ts`, client copy 2026-10-29):

- **$750 bi-weekly Roobet leaderboard**, top 5 paid, ranked on weighted wager.
- **$250 in monthly wager milestones** (`/vip-rewards`).
- **$100 bi-weekly raffle** (`/raffle`) — a ticket per $75 weighted, $75 / $25.
- **First-time deposit bonus** — 5% lossback, $100 monthly cap, handled in Discord.
- **VIP transfer** (`/vip-transfer`).

Headlined as "$950 in potential monthly rewards", verbatim from the client. The
affiliate-revenue claim was removed on 2026-10-29; these replace it.

**Periods break on the 14th and the 28th**, at 08:00 America/New_York — the
deal month runs 14th to 14th. `periodFor()` in `src/lib/format.ts` is the only
place that is decided.

Partner history: Roobet → Shuffle → Lootbox → **Roobet** (2026-10-08). Lootbox
ran alongside it for a week and was removed again on 2026-10-16, taking its
free-battles section with it. `git log` has both if either returns; its final
standings are archived in `data/`.

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
DISCORD_CLAIM_WEBHOOK_URL=<webhook for announcements and VIP applications>
CLAIM_SECRET=<any long random string — signs session cookies>
DISCORD_CLIENT_ID=<OAuth app id>
DISCORD_CLIENT_SECRET=<OAuth app secret>
```

The Roobet JWT *is* the whole credential: the affiliate id is the `id` claim
inside it, so there is nothing else to configure and nothing to keep in sync.

`DISCORD_CLAIM_WEBHOOK_URL` is server-side only and must never become a
`NEXT_PUBLIC_` variable — anyone holding that URL can post into the channel as
the bot. The variable keeps its old name so the Vercel settings did not need
touching when the claim form went. `CLAIM_SECRET` signs the Discord session
and the VIP-transfer cooldown; changing it signs everyone out.

## Deploying to Vercel

1. Import the repo. Vercel detects Next.js; no build settings to change.
2. Add these under Settings → Environment Variables, for Production, Preview and
   Development:
   - **`ROOBET_API_TOKEN`**, **`DISCORD_CLAIM_WEBHOOK_URL`**, **`CLAIM_SECRET`**,
     **`DISCORD_CLIENT_ID`** and **`DISCORD_CLIENT_SECRET`**.
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

**Rotate the Roobet token, the Discord webhook and the Discord client secret
before launch.** All three have been through a chat window.

### Roobet API

`GET https://roobetconnect.com/affiliate/v2/stats?userId=<id>&startDate=&endDate=`,
bearer auth with the JWT. Two things the code depends on:

- **It honours time of day, so bounds go as full ISO timestamps.** Verified on
  2026-10-25: moving the start from 00:00Z to 12:00Z dropped two players, and
  moving the end from midnight to noon moved the weighted total by over $1,200.
  The board opens and closes at 8am Eastern, so date-only bounds would count
  twelve hours of pre-launch play and cut off the last twelve hours of every
  period. The end is sent as the next period's opening instant.
- **It returns `wagered` and `weightedWagered`.** The board ranks, displays and
  totals the weighted figure; see the decisions below.

The Roobet board is **$750 per period, paid $300 / $200 / $125 / $75 / $50** to
the top five.

### Live store — Postgres or Redis required in production

Tournaments, guess the balance, the raffle picker, linked profiles and VIP
reward claims all keep state in `src/lib/store.ts`, ported from Fugroo. It has
two backends, picked by the environment:

- **Redis** the moment `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the
  `UPSTASH_REDIS_REST_*` pair) are set. **Production needs this.** Add *Upstash
  for Redis* from the Vercel Marketplace and both variables are created for
  you; the free tier is far more than this site uses. Keys are prefixed
  `misfitmason:`.
- **Postgres** when `DATABASE_URL` (or `POSTGRES_URL`) is set — **Neon** from
  the Vercel Marketplace, which has a free plan where the Upstash listing did
  not. One table, `misfitmason_store (name, body, updated_at)`, created on first
  use, so connecting the database is the whole setup. Redis wins if both are
  configured, so adding a second integration never makes existing data vanish.
- **Files** under `store/` otherwise, which only works in development: Vercel
  has no writable disk, so without Redis every write throws. The admin panel
  checks for exactly this and says so at the top of every tool; a player
  claiming a milestone gets "not accepting claims right now" rather than a 500.

Not a concurrent database: two admins saving the same bracket in the same
second can lose one edit. For one person running an event that is fine.

### Admin panel

`/admin`, gated on `ADMIN_DISCORD_IDS` (comma-separated Discord account ids —
ids, never handles, since a handle can be released and claimed by someone
else). Unset means nobody gets in. Every tool and every server action re-checks
the session; the nav is a courtesy, not a control. Admins reach it from their
Profile page — the sidebar deliberately does not read the session, because
doing that in the root layout would make every page dynamic and lose the
leaderboard's cache.

Tools: overview · raffle picker · wager raffle · guess the balance ·
tournaments · VIP rewards (mark claims paid) · linked accounts · stream
overlays (OBS URLs).

**Discord sign-in stays for this panel** (and for milestone claims and profile
linking) even though the affiliate claim it was built for is gone.

### Bi-weekly wager raffle

`/raffle`, configured in `WAGER_RAFFLE` (`src/lib/wager-raffle.ts`). Every $75
of **weighted** wager in a leaderboard period is one ticket — the same figure
and the same window the board uses. Two prizes, $75 and $25, one per player.
Not to be confused with the raffle *picker*, which draws from Kick chat.

- **Drawn at the close by the period-close cron**, right after the board's
  announcement, and posted to the same webhook. A dry run shows the pool and
  never draws.
- **Drawn once.** The result is saved in the store (`wager-raffle.json`) and
  `drawRaffle` returns a saved draw unchanged, so a retried cron or an admin
  pressing Draw cannot re-roll it. Picks use `crypto.randomInt`; a winner's
  tickets leave the pool before the next place.
- **`firstPeriodStart`** is the 28 October period — the one live when the
  raffle was announced. Earlier periods are never drawable.
- `/admin/wager-raffle` shows full usernames for payouts, and offers a manual
  draw only for a closed, undrawn period (the cron missed it, or Roobet was
  down at the close).

### Previous leaderboard

`/leaderboards` has a Current / Previous switch. Previous is the last closed
period's final standings (`getPreviousLeaderboard`), labelled "Final" with its
closing time instead of a countdown.

### VIP rewards

`/vip-rewards`. Four monthly levels — $10k → $25, $25k → $50, $50k → $75,
$75k → $100 — that **stack**, each claimable once per month. Configured in
`VIP_REWARDS` (`src/lib/vip-rewards.ts`):

- **Weighted wager**, like the leaderboard. On the raw stake, dice at a 1% edge
  clears $75k for about $750 of expected loss and collects $250. `metric` is
  one line to change if that is ever wanted.
- **Calendar month in Eastern time**, the leaderboard's zone.
- A claim is re-checked against Roobet's own figure on the server, filed to the
  store, then posted to the claims webhook. One claim per Discord account *and*
  per Roobet account per level per month.

Claiming needs a linked Roobet account (`/profile`). Linking checks the name
against the affiliate roster and stores Roobet's own spelling — the Fugroo
original documented this check but never actually made it.

### Tournaments, guess the balance, raffle picker, overlays

Ported from Fugroo with the same behaviour, onto this site's session and
palette (`ported.css` maps Fugroo's token names onto ours; overlays are
crimson-led). Overlays live in their own root layout, `src/app/(overlay)`, so
an OBS browser source gets a transparent page with no sidebar:

- `/overlay/tournament` — the live bracket; `?view=stage` for the single-round
  panel that ends on the champion.
- `/overlay/raffle` — the raffle card and winner.

Every state can be previewed without live data, for positioning a source in
OBS: `/overlay/raffle?demo=open|drawing|winner` and
`/overlay/tournament?demo=1` (add `&view=stage`).

**The skin is `overlay-brand.css`**, loaded after the ported `overlay.css`.
That split is deliberate: `overlay.css` owns layout, sizing units and timing;
the brand file owns only the look, so a sizing fix and a brand change never
touch the same lines. What it carries over from the site: flat surfaces with
the contour texture, depth from a solid lip rather than glow (DESIGN_LOCK rules
glow out), mono labels, crimson for everything that matters and cyan only for
"live". The ported animations kept their timing but now move the lip instead of
a halo — the winner reveal presses the card down and springs it back, like the
site's buttons. The mascot, the leaderboard's crown emblem and the chalice mark
the winner and champion, and every overlay carries the code.

The raffle picker reads Kick chat **from the admin's browser** (Kick's Pusher
socket), so entries only collect while that tab is open. The server looks the
channel up on Kick (`KICK_CHANNEL`, default `misfitmason`). **Kick's firewall
blocks a spoofed Chrome user-agent from a server** — the Fugroo original sent
one and the lookup came back 403, which the panel reported as "no chatroom".
`kick.ts` now sends an honest `MisfitMasonSite/1.0` UA, verified against both
Kick calls. Fugroo has the same bug.

Kick account linking (for the "under code" raffle gate) is optional and needs a
Kick developer app: `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, redirect
`https://www.misfitmason.com/api/kick/callback`.

### Sign-in returns you where you were

`/api/auth/discord/login?next=/path` carries the destination through the
signed OAuth state cookie. `safeNext()` honours same-site paths only —
`//host`, `/\host`, absolute URLs and control characters fall back to `/profile`,
so the Discord consent screen cannot be used as an open redirect.

### Period-close announcements

When a period ends, `/api/cron/period-close` posts the final table into
the Discord channel, then draws and posts the wager raffle. Run by Vercel Cron (`vercel.json`), guarded by
`CRON_SECRET` — Vercel sends it as a bearer token automatically once the
variable is set, and the route refuses outright when it is unset rather than
leaving a public endpoint that posts to Discord.

**Why two daily schedules and a window, rather than one cron at the close.**
There is no database, so nothing can record "already announced". The guard is
time instead: a run only posts within an hour of a close, and the two schedules
(12:30 and 13:30 UTC) are placed so exactly one of them falls in that window —
whichever side of the US clock change the board is on, since 8am Eastern is
12:00 UTC in summer and 13:00 UTC in winter. The half-hour delay is deliberate:
Roobet's figures update hourly, and announcing off a stale read is worse than
announcing late.

The route refuses to invent a period: before the first boundary there is no
previous period, and `periodFor` answers that case with the first period
itself, so `closedPeriod` returns null rather than announcing the period that is
still running as its own final standings.

Query parameters, all requiring the secret:

- `dry=1` builds the message and returns it without posting or drawing. It
  runs without a webhook configured, so it can be tried locally with the real
  one blanked.
- `at=<ISO>` pretends it is another time — **dry runs only**, so a preview
  cannot announce the wrong period.
- `force=1` posts outside the window, for a run that was missed.

Usernames are wrapped in inline code: masked names begin with asterisks, which
Discord otherwise reads as bold markers and swallows the rest of the line.

### Discord sign-in

Used by the admin panel, milestone claims and profile linking. The affiliate
claim form it was first built for was removed on 2026-10-29.

**Discord OAuth.** `identify` scope only — an account id to check and a name
to show, nothing more. Register the callback for **every
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

Discord blocks posts from unfamiliar user agents, so both the webhook calls and
the OAuth calls send an explicit one — a bare default gets a 403 with no useful
body.

### VIP transfer applications

Its own page at `/vip-transfer`, posting multipart to `POST /api/vip-transfer`
and into the **same webhook as the announcements**. A page rather than a section of
`/rewards` because it is the one thing people arrive at with intent — sent a
link from a stream or the Discord — and a link into the middle of a long page
is a worse answer than a page of its own. An
applicant holding a VIP level at another casino sends their username, where they
play now, their lossback tier, and screenshots of their last 30 days and
lifetime wagered; a person reads it in Discord and Roobet decides the tier.

Nothing is stored — the images stream to Discord as attachments and the request
ends. Holding other people's account screenshots would serve nothing, since the
only thing anyone does with an application is read it and reply.

Sign-in is optional here: someone arriving from a stream
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

`src/lib/staff.ts` holds the usernames that never appear on a board — currently
one staff member under three aliases: Hooly (Lootbox), Warhooly (Shuffle) and
Hooly123 (Roobet). They are also left out of VIP rewards and the wager raffle,
which pay against the same wager figures. Being excluded is not being an admin; that list is separate. They are
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

- **Each board runs its own schedule**, set by `schedule` on the partner and
  resolved by `periodFor()`. Roobet opened on 2026-10-14 at 08:00
  America/New_York and now **breaks on the 14th and the 28th of every month**
  (`monthly-days`, client decision 2026-10-29: the deal month starts on the
  14th, so the 28 Oct period runs to 14 Nov). Periods are 13–17 days rather than
  a fixed fortnight. The half-month and rolling 14-day shapes are still there.
- **A schedule stores a zone, not a UTC instant.** Eastern is UTC-4 on
  14 October and UTC-5 from 1 November, so a fixed offset would quietly move the
  advertised 8am start to 7am from the third period onwards. Boundaries are
  computed by adding whole days to the anchor *date* and resolving the time in
  the zone — adding 14x24h to an instant drifts the same way — and `periodLabel`
  reads its dates in that zone, since a period ending 07:59 local is the next
  day in UTC. Both APIs take a real date range, so the
  boards reset by themselves with no snapshot or cron.
- **A board with a start date in the future shows the date, not an empty
  board.** The service does not call the API for a window that has not begun —
  it would return nothing and render as a live competition nobody had entered —
  so `upcoming` is set and the page counts down to the opening instead.
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
source art in the repo root — including the challenge slot tiles — the lodge backdrop, the light shaft, the table
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

The referral link and code are real: `https://roobet.com/?ref=MisfitMason`
(`MisfitMason`), confirmed by the client on 2026-10-08. The code is **mixed
case**; it is shown as typed and the link carries the same casing, since
affiliate attribution may be case-sensitive.
