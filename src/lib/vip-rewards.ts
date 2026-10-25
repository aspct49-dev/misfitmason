import 'server-only';

import { randomBytes } from 'node:crypto';

import { formatMoney, zonedInstant } from './format';
import { PARTNERS } from './partners';
import { fetchRoobetRows } from './roobet-stats';
import type { SessionUser } from './session';
import { mutateJson, readJson } from './store';

/**
 * Monthly VIP rewards: wager milestones inside a calendar month, each paid once.
 *
 * Levels **stack**. Reaching $75,000 unlocks every level below it, so a player
 * who gets there claims all four rather than only the top one — which is how
 * the cards read, one claim button each.
 *
 * Measured on Roobet's **weighted** wager, the same figure the leaderboard
 * ranks on. A milestone paid on the raw stake is the easiest thing on the site
 * to farm: dice at a 1% edge clears $75,000 for about $750 of expected loss and
 * collects $250. Weighting is what makes a milestone mean play rather than
 * volume. Switching to raw is one line below.
 *
 * The month is the calendar month in Eastern time, the zone the leaderboard is
 * already anchored to, so "this month" means the same thing everywhere on the
 * site.
 */

export const VIP_REWARDS = {
  metric: 'weighted' as 'weighted' | 'raw',
  timeZone: 'America/New_York',
  levels: [
    { level: 1, wager: 10_000, reward: 25 },
    { level: 2, wager: 25_000, reward: 50 },
    { level: 3, wager: 50_000, reward: 75 },
    { level: 4, wager: 75_000, reward: 100 },
  ],
};

export type VipLevel = (typeof VIP_REWARDS.levels)[number];

export const VIP_REWARD_TOTAL = VIP_REWARDS.levels.reduce((s, l) => s + l.reward, 0);

/* ------------------------------------------------------------------ month */

export interface Month {
  /** YYYY-MM, in the rewards zone. The key claims are filed under. */
  key: string;
  start: Date;
  end: Date;
  label: string;
}

/** The calendar month containing `now`, in the rewards zone. */
export function monthOf(now: Date = new Date()): Month {
  const tz = VIP_REWARDS.timeZone;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const y = Number(parts.year);
  const m = Number(parts.month) - 1;

  const start = zonedInstant(y, m, 1, 0, 0, tz);
  const next = zonedInstant(y, m + 1, 1, 0, 0, tz);
  return {
    key: `${y}-${String(m + 1).padStart(2, '0')}`,
    start,
    end: new Date(next.getTime() - 1000),
    label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: tz }),
  };
}

/* ----------------------------------------------------------------- wagers */

/**
 * Everyone's wager for a month, cached per month.
 *
 * Roobet returns every player in one call, so one fetch serves every visitor's
 * progress bar. Five minutes, the same as the roster: the endpoint rate limits,
 * and a progress bar a few minutes behind is indistinguishable from live.
 */
const TTL = 5 * 60_000;
const monthCache = new Map<string, { at: number; wagers: Map<string, number> }>();

async function monthWagers(month: Month): Promise<Map<string, number>> {
  const hit = monthCache.get(month.key);
  if (hit && Date.now() - hit.at < TTL) return hit.wagers;

  const rows = await fetchRoobetRows(month.start, new Date(month.end.getTime() + 1000));
  const wagers = new Map<string, number>();
  for (const row of rows) {
    if (!row.username) continue;
    const figure =
      VIP_REWARDS.metric === 'weighted' ? (row.weightedWagered ?? row.wagered ?? 0) : (row.wagered ?? 0);
    wagers.set(row.username.trim().toLowerCase(), figure);
  }
  monthCache.set(month.key, { at: Date.now(), wagers });
  return wagers;
}

/** A player's wager for the month, or null if the lookup failed. */
export async function wagerFor(roobetUsername: string, month: Month = monthOf()): Promise<number | null> {
  try {
    const wagers = await monthWagers(month);
    return wagers.get(roobetUsername.trim().toLowerCase()) ?? 0;
  } catch (error) {
    console.error('[vip-rewards] wager lookup failed:', error);
    return null;
  }
}

/* ----------------------------------------------------------------- claims */

export type ClaimStatus = 'pending' | 'paid';

export interface VipClaim {
  id: string;
  month: string;
  level: number;
  reward: number;
  /** The wager figure at the moment of claiming, for the reviewer. */
  wager: number;
  discordId: string;
  discordName: string;
  roobet: string;
  at: string;
  status: ClaimStatus;
  paidAt?: string;
}

interface Store {
  claims: VipClaim[];
}

const FILE = 'vip-claims.json';
const EMPTY: Store = { claims: [] };

export async function listClaims(): Promise<VipClaim[]> {
  const { claims } = await readJson<Store>(FILE, EMPTY);
  return [...claims].sort((a, b) => b.at.localeCompare(a.at));
}

export async function claimsFor(discordId: string, monthKey: string): Promise<VipClaim[]> {
  const { claims } = await readJson<Store>(FILE, EMPTY);
  return claims.filter((c) => c.discordId === discordId && c.month === monthKey);
}

export type ClaimResult = { ok: true; claim: VipClaim } | { ok: false; error: string };

/**
 * Files a claim for one level, if it has been earned and not already claimed.
 *
 * Everything is re-checked here against Roobet's figure, never against what
 * the page showed: a stale tab or a hand-made request should not be able to
 * claim a level the account has not reached.
 *
 * One claim per Discord account per level per month, and — separately — one
 * per *Roobet* account per level per month. The second is what stops two
 * Discord accounts linked to the same play from collecting twice; profiles
 * already refuse a Roobet name linked elsewhere, but the claim does not rely
 * on that alone.
 */
export async function fileClaim(
  user: SessionUser,
  roobetUsername: string,
  level: number,
): Promise<ClaimResult> {
  const tier = VIP_REWARDS.levels.find((l) => l.level === level);
  if (!tier) return { ok: false, error: 'That level does not exist.' };

  const month = monthOf();
  const wager = await wagerFor(roobetUsername, month);
  if (wager === null) {
    return { ok: false, error: 'Could not reach Roobet to check your wager. Try again in a minute.' };
  }
  if (wager < tier.wager) {
    return {
      ok: false,
      error: `Level ${tier.level} needs ${formatMoney(tier.wager)} this month — you are on ${formatMoney(wager)}.`,
    };
  }

  let result: ClaimResult = { ok: false, error: 'Could not file that claim.' };
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const duplicate = s.claims.find(
      (c) =>
        c.month === month.key &&
        c.level === tier.level &&
        (c.discordId === user.id || c.roobet.toLowerCase() === roobetUsername.toLowerCase()),
    );
    if (duplicate) {
      result = { ok: false, error: `Level ${tier.level} is already claimed for ${month.label}.` };
      return;
    }
    const claim: VipClaim = {
      id: randomBytes(6).toString('hex'),
      month: month.key,
      level: tier.level,
      reward: tier.reward,
      wager,
      discordId: user.id,
      discordName: user.username,
      roobet: roobetUsername,
      at: new Date().toISOString(),
      status: 'pending',
    };
    s.claims.push(claim);
    result = { ok: true, claim };
  });
  return result;
}

export async function setClaimStatus(id: string, status: ClaimStatus): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const claim = s.claims.find((c) => c.id === id);
    if (!claim) return;
    claim.status = status;
    if (status === 'paid') claim.paidAt = new Date().toISOString();
    else delete claim.paidAt;
  });
}

/* ---------------------------------------------------------------- discord */

const UA = 'MisfitMasonClaims/1.0 (+https://www.misfitmason.com)';

/** Posts a filed claim into the claims channel. A failure here never un-files it. */
export async function announceClaim(claim: VipClaim, avatarUrl: string | null): Promise<boolean> {
  const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim();
  if (!webhook) return false;

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({
        username: 'Misfit Mason claims',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: `VIP reward — Level ${claim.level}`,
            color: 0xe31b45,
            ...(avatarUrl ? { thumbnail: { url: avatarUrl } } : {}),
            fields: [
              { name: 'Discord', value: `${claim.discordName} (${claim.discordId})`, inline: true },
              { name: PARTNERS.roobet.name, value: `\`${claim.roobet}\``, inline: true },
              { name: 'Reward', value: `**${formatMoney(claim.reward)}**`, inline: true },
              {
                name: `${VIP_REWARDS.metric === 'weighted' ? 'Weighted' : 'Wagered'} this month`,
                value: formatMoney(claim.wager),
                inline: true,
              },
              { name: 'Month', value: claim.month, inline: true },
            ],
            footer: { text: 'misfitmason.com · mark paid in /admin/vip-rewards' },
            timestamp: claim.at,
          },
        ],
      }),
    });
    if (!res.ok) console.error('[vip-rewards] webhook rejected:', res.status, await res.text());
    return res.ok;
  } catch (error) {
    console.error('[vip-rewards] webhook failed:', error);
    return false;
  }
}
