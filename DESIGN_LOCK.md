# MISFIT MASONS — DESIGN LOCK

Revised 2026-09-05 after a UI/UX audit. The first pass was an "underground
poster" treatment — display type, glow, grain, slogan headlines. It was replaced
with a restrained premium dark UI, which is what the brief actually called for.

---

## BRAND

**Positioning.** A Kick streamer's community leaderboard site. Not a platform,
not a casino, not a product.

**Personality.** Quiet, precise, confident. The mascot — a suited rabbit in a
black fedora — carries the personality so the interface does not have to.

**Voice.** Plain and factual. State the number, the rule, the mechanism. No
slogans, no first-person swagger, no headline that could belong to any other
site in the category.

**Copy rules.**
- No two-line punchy headlines with full stops.
- Headings are nouns: "Leaderboards", "Affiliate revenue", "Getting started".
- Never imply gambling is profitable, and never imply a community larger than
  the one that exists.

---

## VISUAL

### Colour — sampled from the mascot artwork

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#080E16` | page ground |
| `--surface` | `#0E1622` | cards, sidebar, footer |
| `--surface-2` | `#141F2E` | raised state, active nav |
| `--border` | `#1E2C3D` | every divider and outline |
| `--border-strong` | `#2A3C52` | hover borders |
| `--text` | `#F2F6FA` | primary |
| `--muted` | `#93A7BD` | body copy — 7.2:1 on surface |
| `--dim` | `#7B90A8` | labels — 5.3:1 on surface |
| `--accent` | `#E31B45` | prize figures, rank 1, primary buttons |
| `--live` | `#3CF0F0` | the Kick LIVE chip and focus rings, nothing else |

No gold, no green: gold is Gumbo's podium and green is Stake's money column.
Accent appears on roughly three elements per screen.

### Typography

- **DM Sans** — everything. 400/500/600/700.
- **JetBrains Mono** — figures, labels, countdown, referral codes. Tabular figures.
- Mono is for numbers and short uppercase labels only. Words set in mono at
  display size read as a terminal, not as a prize.
- No display or poster face anywhere.

### Surfaces

- Flat fills. No gradients, no grain, no glow shadows.
- 6px radius on controls, 10px on cards.
- 1px `--border` for every separation; borders instead of shadows.
- Hierarchy from size, weight and space — not from decoration.

### Motion

150–350ms, `cubic-bezier(0.4, 0, 0.2, 1)`. Scroll reveal is 12px and 350ms.
Hover changes colour and border only, never scale or position. Full
`prefers-reduced-motion` support.

### Accessibility floor

- One global `:focus-visible` ring, 2px `--live` at 2px offset.
- All three text tokens exceed 4.5:1 on both `--bg` and `--surface`.
- Buttons and nav items are ≥44px tall.
- Tabs are real `role="tab"` buttons with `aria-selected`; the drawer toggle
  carries `aria-expanded` and `aria-controls`.

---

## HOMEPAGE — section order

1. **Intro** — one label, one heading, one descriptive paragraph. No slogan.
2. **Standings** — partner tabs, prize banner, countdown, the paying places,
   whole-board stats.
3. **Kick row** — a link out, not an embed.
4. **Affiliate revenue** — mechanism plus a summary table.
5. **Free battles** — Lootbox depositor reward.
6. **Getting started** — three steps.
7. **Partners** — one card each.
8. **Footer** — legal, responsible gambling, socials.

---

## LEADERBOARDS

- **Banner podium for the paying places, table beneath.** Every paying place is
  always rendered; with a small player base most are open most of the time, and
  an open place shows the prize rather than being hidden.
- **Rank 1** is marked by a 3px accent rail and a 10%-opacity accent tint. Not a
  glow, not a crown, not gold.
- **Open places** say "Open place" with the prize still shown. No dashed borders
  and no second line — the prize column already states what is at stake.
- **Metric**: raw wagered (client decision, 2026-09-05), stated in the rules.
- **Prizes** — Shuffle $250: `125/75/50`. Lootbox: split unannounced.
- **No minimum** to qualify. Usernames masked to the last four characters.
- **Mobile**: the wagered column collapses under the prize; rank, player and
  prize stay. No horizontal scroll at 390px.
- **No activity ticker and no member counts**, at any community size that would
  make them misleading.

---

## PARTNERS

- **Shuffle** — live. `affiliate.shuffle.com/wager/<uuid>`, server-side only; the
  UUID in the path is the credential. Takes no parameters and is rate limited,
  so the period shown is ours, not theirs. Referral
  `https://shuffle.com/?r=MisfitMason`, code `MisfitMason`.
- **Lootbox** — announced, not open. GraphQL at `api.lootbox.com/graphql` with
  introspection disabled, so the query is not wired up. Renders a coming-soon
  panel. Referral `https://lootbox.com/r/misfitmason`, code `misfitmason`.
- A third partner is a registry entry plus a provider module.

---

## TECHNICAL

Next.js 15 App Router, TypeScript, plain CSS with tokens. No Tailwind and no
component library — both drag a dark UI toward the same generic result.

```
src/lib/types.ts          domain shapes
src/lib/partners.ts       pools, splits, codes, links — single source
src/lib/providers/        one module per casino, same interface
src/lib/services/         the only thing the UI calls
src/app/api/              server proxy; the token never reaches the browser
src/components/           presentational
```

---

## PLACEHOLDERS

Wordmark set in type (mascot used as the mark) · Lootbox free-battle rules ·
Discord invite · Kick live state · Lootbox standings · legal copy drafted but
not reviewed by a lawyer.
