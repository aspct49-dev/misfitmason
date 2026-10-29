import { periodFor, timeLabel } from './format';
import type { Partner, PartnerId, VipTransfer } from './types';

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
    // Opens 14 October 2026 at 8am Eastern (client decision) and runs
    // fortnights from there. The zone is carried rather than baked into a UTC
    // instant: Eastern is UTC-4 that day and UTC-5 from 1 November, and a board
    // advertised as opening at 8am has to keep opening at 8am.
    // Breaks on the 14th and the 28th at 8am Eastern (client decision,
    // 2026-10-29): the deal runs month to month from the 14th, so two periods
    // sit inside each deal month. The period that opened 28 Oct therefore runs
    // to 14 Nov rather than the 11 Nov a strict fortnight would have given.
    // The zone is carried rather than baked into a UTC instant: Eastern moves
    // from UTC-4 to UTC-5 on 1 November, and 8am has to stay 8am.
    schedule: {
      kind: 'monthly-days',
      days: [14, 28],
      opens: '2026-10-14',
      time: '08:00',
      timeZone: 'America/New_York',
    },
    hasLiveApi: true,
    comingSoon: false,
    blurb: 'Slots, originals, crash and sports. Standings come from the Roobet affiliate API.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['roobet'];

export function getPartner(id: PartnerId): Partner {
  return PARTNERS[id];
}

/** How a partner's periods run, in a sentence. Rendered in the rules and legal copy. */
export function scheduleLine(partner: Partner): string {
  const { schedule } = partner;
  if (schedule.kind === 'rolling') {
    const first = periodFor(schedule).start;
    const opens = first.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: schedule.timeZone,
    });
    const at = timeLabel(first.toISOString(), schedule.timeZone);
    return `runs in ${schedule.days}-day periods from ${opens}, each opening and closing at ${at}`;
  }
  if (schedule.kind === 'monthly-days') {
    const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
    const days = schedule.days.map(ord);
    const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} and the ${days[days.length - 1]}` : days[0];
    // The hour as it reads in the zone today; the rule is "8am Eastern" year round.
    const at = timeLabel(periodFor(schedule).start.toISOString(), schedule.timeZone).replace(/ [A-Z]{2,4}$/, '');
    return `runs twice a month, from the ${list} to the next, each period opening and closing at ${at} Eastern`;
  }
  return 'runs twice a month — the 1st to the 15th, and the 16th to the last day — each opening and closing at 00:00 UTC';
}

/** The headline partner. Single-partner today; the registry keeps it swappable. */
export const PRIMARY_PARTNER = PARTNERS.roobet;

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
 * The rewards line-up, in the client's words and order (2026-10-29). It
 * replaced the 100% affiliate-revenue return, which is no longer offered.
 *
 * The headline figure is the client's own, used as given.
 */
export const REWARDS_HEADLINE = '$950 In Potential Monthly Rewards';

export const REWARDS_LINEUP = [
  {
    id: 'leaderboard',
    figure: '$750',
    title: 'Bi-Weekly Leaderboard',
    detail: 'Top 5 positions paid, ranked on weighted wager.',
    href: '/leaderboards',
    cta: 'View the board',
  },
  {
    id: 'milestones',
    figure: '$250',
    title: 'Monthly Wager Milestones',
    detail: 'Four levels, each paid once a month as you reach it.',
    href: '/vip-rewards',
    cta: 'See your progress',
  },
  {
    id: 'raffle',
    figure: '$100',
    title: 'Bi-Weekly Raffle',
    detail: 'A ticket for every $75 of weighted wager. $75 first, $25 second.',
    href: '/raffle',
    cta: 'See your tickets',
  },
  {
    id: 'deposit',
    figure: '5%',
    title: 'First Time Deposit Bonus',
    detail: '5% lossback, capped at $100 a month.',
    href: 'DISCORD',
    cta: 'Details in the Discord',
  },
  {
    id: 'vip',
    figure: 'VIP',
    title: 'VIP Transfer',
    detail: 'Already a VIP elsewhere? Apply to have your level matched.',
    href: '/vip-transfer',
    cta: 'Apply',
  },
] as const;

export const SOCIALS = {
  kick: 'https://kick.com/misfitmason',
  twitch: 'https://twitch.tv/misfit_mason',
  youtube: 'https://youtube.com/@MisfitMason',
  tiktok: 'https://tiktok.com/@MisfitMason',
  x: 'https://x.com/MasonMisfit',
  discord: 'https://discord.gg/Cawf7MQt9K',
};
