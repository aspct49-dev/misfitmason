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
    metricLabel: 'Total amount wagered',
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
    // Provisional and deliberately not shown anywhere while the board is
    // unannounced — publishing a split we have not committed to would be a
    // promise we cannot keep.
    prizeTable: [100, 60, 40],
    metricLabel: 'Total amount wagered',
    hasLiveApi: false,
    comingSoon: true,
    blurb: 'Case battles, boxes and upgrades. Depositors also receive free battles.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['shuffle', 'lootbox'];

export function getPartner(id: PartnerId): Partner {
  return PARTNERS[id];
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
