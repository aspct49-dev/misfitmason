# Misfit Mason

Community leaderboard site for the Kick streamer MisfitMason. Roobet and Lootbox
standings, 100% affiliate revenue return, free Lootbox battles.

Design spec: [DESIGN_LOCK.md](DESIGN_LOCK.md).

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

`.env` holds the Roobet token (gitignored — see `.env.example`):

```
ROOBET_API_TOKEN=<affiliateStats JWT>
```

## Deploying to Vercel

1. Import the repo. Vercel detects Next.js; no build settings to change.
2. Add **`ROOBET_API_TOKEN`** under Settings → Environment Variables, for
   Production, Preview and Development.
3. Redeploy.

The build does **not** fail without the token — the Roobet provider throws, the
service catches it, and the board renders sample data flagged as such. That is
deliberate so a first deploy succeeds before the variable is set, but it also
means a missing or expired token shows as sample standings rather than as an
error. `[leaderboard] roobet provider failed: …` in the build log is the tell.

Pages using live data are statically generated with `revalidate = 60`, so
standings refresh about once a minute without a rebuild.

There is no separate `ROOBET_USER_ID` to configure: the affiliate id is the `id`
claim inside the token, and `affiliateIdFromToken()` reads it out.

**Rotate the token before launch.** It has been through a chat window.

## Architecture

```
src/lib/types.ts            domain shapes; no React, no fetch
src/lib/partners.ts         prize pools, splits, codes, links — the only place they live
src/lib/format.ts           masking + money/period formatting
src/lib/providers/roobet    live API, server-only
src/lib/providers/lootbox   fixtures behind the identical interface
src/lib/providers/shared    fills a prize table to N seats, marking empties unclaimed
src/lib/services/leaderboard the only entry point the UI calls
src/lib/mock/               fixtures
src/app/api/leaderboard/    JSON proxy (OBS overlays, bots) — token never leaves the server
src/components/             presentational, take data as props
```

The UI never imports a provider, so which casino is live and which is mock stays
an implementation detail. Components read `board.source` to decide whether to
show the MOCK badge.

### Adding the Lootbox API when it arrives

1. Replace the body of `lootboxProvider.fetchLeaderboard` with the HTTP call.
2. Map the response into `RawPlayer[]` and pass it through `buildEntries`.
3. Return `source: 'live'`.
4. Set `hasLiveApi: true` in `src/lib/partners.ts`.

Nothing in the UI changes and the MOCK badge disappears on its own.

### Adding another casino

Add an entry to `PARTNERS` and `PARTNER_ORDER`, add a `PartnerId`, write a
provider implementing `LeaderboardProvider`, register it in
`src/lib/services/leaderboard.ts`. The tabs, podium, rules and partner cards all
render from the registry.

## Decisions worth knowing

- **Ranked on raw `wagered`**, not `weightedWagered` (client decision, 2026-09-05).
  Roobet weights by house edge — the current top player's $2,458 wagered is $499
  weighted because he plays Limbo. Raw ranking is farmable on low-edge games;
  it is stated explicitly in the rules copy either way.
- **Five seats always render.** The affiliate base is genuinely small, so unfilled
  paying positions show as `UNCLAIMED` with the prize attached rather than being
  hidden.
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
| Lootbox standings | `src/lib/mock/lootbox.ts` |
| Legal copy | `src/app/legal/page.tsx` — drafted, not legal advice |

## Asset pipeline

`node scripts/process-assets.mjs` regenerates everything in `public/` from the
source art in the repo root — the lodge backdrop, the light shaft, the table
edge, the five drifting props, the four tiles, the banner frames, the rank
emblems and the page texture. Sources are committed alongside the outputs, so
the pipeline is reproducible from a fresh clone.

The one input that is **not** committed is `header.png` — Gumbo's own artwork,
kept locally as a visual reference only and never shipped.

Referral links and codes are real:
`https://roobet.com/?ref=kickmisfitmason` (`kickmisfitmason`) and
`https://lootbox.com/r/misfitmason` (`misfitmason`).
