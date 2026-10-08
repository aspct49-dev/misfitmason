import type { AffiliateReturn, Partner, PartnerId } from './types';

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
    code: 'kickmisfitmason',
    logo: '/roobet-logo.png',
    signupUrl: 'https://roobet.com/?ref=kickmisfitmason',
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
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Slots, originals, crash and sports. Standings come from the Roobet affiliate API.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['roobet'];

export function getPartner(id: PartnerId): Partner {
  return PARTNERS[id];
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
