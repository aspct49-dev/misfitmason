import type { AffiliateReturn, FreeBattleProgram, Partner, PartnerId } from './types';

/**
 * The partner registry. Prize pools, splits and codes live here and nowhere
 * else — a new casino or a changed prize table is an edit to this file.
 *
 * Referral links are the real ones. The code shown to players is taken from the
 * link's own referral parameter, so the two cannot drift apart.
 */
export const PARTNERS: Record<PartnerId, Partner> = {
  shuffle: {
    id: 'shuffle',
    name: 'Shuffle',
    code: 'MisfitMason',
    logo: '/shuffle-logo.webp',
    signupUrl: 'https://shuffle.com/?r=MisfitMason',
    prizePool: 250,
    prizeTable: [125, 75, 50],
    metricLabel: 'Weighted amount wagered',
    // Client decision, 2026-09-14. Shuffle publishes no per-game weighting
    // table, so the note describes the mechanism rather than quoting figures we
    // cannot verify.
    weighted: true,
    weightingNote: [
      'Shuffle weights every bet by the house edge of the game it is placed on. Higher-edge games count for more of the stake; low-edge games count for only a small fraction of it.',
      'The figure on this board is that weighted total, so it is normally well below the amount wagered shown in your Shuffle account.',
      'The weighting is calculated by Shuffle, not by us, and applies the same way to every player on the board.',
    ],
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Slots, originals and sports. Standings come from the Shuffle affiliate API.',
  },
  lootbox: {
    id: 'lootbox',
    name: 'Lootbox',
    code: 'misfitmason',
    logo: '/lootbox-logo.svg',
    signupUrl: 'https://lootbox.com/r/misfitmason',
    prizePool: 200,
    // Mirrors Shuffle's 50/30/20 split, scaled to the smaller pool.
    prizeTable: [100, 60, 40],
    metricLabel: 'Total amount wagered',
    // Lootbox's API returns only the raw figure, so this board cannot be
    // weighted even if that becomes the policy.
    weighted: false,
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Case battles, boxes and upgrades. Depositors also receive free battles.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['shuffle', 'lootbox'];

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
