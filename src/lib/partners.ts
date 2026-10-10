import type { AffiliateReturn, FreeBattleProgram, Partner, PartnerId, VipTransfer } from './types';

/**
 * The partner registry. Prize pools, splits and codes live here and nowhere
 * else — a new casino or a changed prize table is an edit to this file.
 *
 * Referral links are the real ones. The code shown to players is taken from the
 * link's own referral parameter, so the two cannot drift apart.
 */
export const PARTNERS: Record<PartnerId, Partner> = {
  roobet: {
    id: 'roobet',
    name: 'Roobet',
    code: 'MisfitMason',
    logo: '/roobet-logo.png',
    signupUrl: 'https://roobet.com/?ref=MisfitMason',
    prizePool: 750,
    // Client split, 2026-10-08. Five paying places; must always total prizePool.
    prizeTable: [300, 200, 125, 75, 50],
    metricLabel: 'Weighted amount wagered',
    // Roobet discounts each bet by the game's RTP and reports the result as
    // weightedWagered. Ranking on the raw stake let low-edge grinding buy a
    // prize place, so the weighted figure is what is ranked, shown and totalled.
    weighted: true,
    weightingNote: [
      'Roobet weights every bet by the RTP of the game it is placed on: a game returning 97% or less counts in full, one between 97.01% and 98.99% counts at half, and one at 99% or above counts at a tenth.',
      'The figure on this board is that weighted total, so a month spent on dice moves it far less than the same money through slots, and it sits below the amount wagered shown in your Roobet statistics.',
      'The bands are set by Roobet, not by us. We apply no weighting of our own on top, and they apply the same way to every player on the board.',
    ],
    // Opens 14 October 2026 (client decision) and runs true fortnights from
    // there, so every period is the same length even where it crosses a month.
    schedule: { kind: 'rolling', anchor: '2026-10-14T00:00:00.000Z', days: 14 },
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Slots, originals, crash and sports. Standings come from the Roobet affiliate API.',
  },
  lootbox: {
    id: 'lootbox',
    name: 'Lootbox',
    code: 'misfitmason',
    logo: '/lootbox-logo.svg',
    signupUrl: 'https://lootbox.com/r/misfitmason',
    prizePool: 500,
    // Client split, 2026-10-01. Five paying places rather than three, so the
    // pot reaches further down a small field. Must always total prizePool.
    prizeTable: [225, 125, 75, 50, 25],
    metricLabel: 'Total amount wagered',
    // Lootbox's API returns only the raw figure, so this board cannot be
    // weighted even if that becomes the policy.
    weighted: false,
    // Unchanged since the board opened: players know these dates.
    schedule: { kind: 'half-month' },
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Case battles, boxes and upgrades. Depositors also receive free battles.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['roobet', 'lootbox'];

export function getPartner(id: PartnerId): Partner {
  return PARTNERS[id];
}

/** How a partner's periods run, in a sentence. Rendered in the rules and legal copy. */
export function scheduleLine(partner: Partner): string {
  if (partner.schedule.kind === 'rolling') {
    const opens = new Date(partner.schedule.anchor).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `runs in ${partner.schedule.days}-day periods from ${opens}, each opening and closing at 00:00 UTC`;
  }
  return 'runs twice a month — the 1st to the 15th, and the 16th to the last day — each opening and closing at 00:00 UTC';
}

/** Column and caption label for the figure a board ranks on. */
export function wagerLabel(partner: Partner): string {
  return partner.weighted ? 'Weighted' : 'Wagered';
}

/** Combined pot across every partner — the figure on the nav badge. */
export const TOTAL_PRIZE_POOL = PARTNER_ORDER.reduce(
  (sum, id) => sum + PARTNERS[id].prizePool,
  0,
);

/**
 * VIP transfer. The mechanism is real; the tiers belong to the casino, which is
 * why nothing here states an amount.
 */
export const VIP_TRANSFER: VipTransfer = {
  headline: 'VIP transfer',
  requirement: `Hold a VIP level at another casino and open ${PARTNERS.roobet.name} under code ${PARTNERS.roobet.code}`,
  reward: `${PARTNERS.roobet.name} reviews your play and matches you into its VIP programme`,
  cadence: 'Within a few days',
  isPlaceholder: true,
};

/**
 * PLACEHOLDER. The client has not supplied the real free-battle rules yet, so
 * every string here is provisional and the UI flags it as such.
 */
export const FREE_BATTLES: FreeBattleProgram = {
  partnerId: 'lootbox',
  headline: 'Free battles',
  requirement: 'Deposit on Lootbox using the referral link',
  reward: 'Free battle entries',
  cadence: 'Ongoing',
  isPlaceholder: true,
};

/**
 * The affiliate return. The percentage is fixed and real; the mechanics are
 * placeholders pending the client's operational detail.
 */
export const AFFILIATE_RETURN: AffiliateReturn = {
  percentage: 100,
  cadence: 'Monthly',
  method: 'Claimed on this site, paid manually',
  isPlaceholder: true,
};

export const SOCIALS = {
  kick: 'https://kick.com/misfitmason',
  twitch: 'https://twitch.tv/misfit_mason',
  youtube: 'https://youtube.com/@MisfitMason',
  tiktok: 'https://tiktok.com/@MisfitMason',
  x: 'https://x.com/MasonMisfit',
  /** PLACEHOLDER until the client sends the invite. */
  discord: 'https://discord.gg/6pDbYYuAW',
};
