/**
 * Domain types. No React, no fetch, no UI concerns — these are the shapes every
 * partner provider must normalise down to, so the leaderboard components never
 * learn which casino a row came from.
 */

export type PartnerId = 'shuffle' | 'lootbox';

/** Whether the numbers on screen came from a real API or from fixtures. */
export type DataSource = 'live' | 'mock';

export interface Partner {
  id: PartnerId;
  name: string;
  /** Referral code the player types at signup. */
  code: string;
  /** Operator's own brand mark, served from /public. */
  logo: string;
  signupUrl: string;
  /** Total pot for the current period, in whole dollars. */
  prizePool: number;
  /** Payout per rank, index 0 = 1st. Length defines how many seats pay. */
  prizeTable: number[];
  /** What the ranking is measured on, stated verbatim in the rules copy. */
  metricLabel: string;
  /** True once a real API is wired up; drives the MOCK badge in the UI. */
  hasLiveApi: boolean;
  /** Announced but not yet running: the board renders a coming-soon state. */
  comingSoon: boolean;
  blurb: string;
}

export interface BiggestHit {
  username: string;
  multiplier: number;
  gameTitle: string;
  wagered: number;
  payout: number;
}

export interface LeaderboardEntry {
  rank: number;
  /** Masked for display — providers must never return a full username. */
  username: string;
  wagered: number;
  prize: number;
  favouriteGame?: string;
  /** Partner's own player-tier badge, if it publishes one. */
  tierBadgeUrl?: string;
  /** A paying seat nobody has taken yet. */
  unclaimed: boolean;
}

/** Whole-board aggregates, computed from every player, not just the paid places. */
export interface BoardStats {
  players: number;
  totalWagered: number;
  topWager: number;
}

export interface Leaderboard {
  partnerId: PartnerId;
  prizePool: number;
  /** Always prizeTable.length long — unfilled seats come back unclaimed. */
  entries: LeaderboardEntry[];
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
  source: DataSource;
  stats: BoardStats;
  biggestHit?: BiggestHit;
  /** Set when a live provider failed and fixtures were served instead. */
  error?: string;
}

/** What every partner integration implements. Adding a casino = adding one of these. */
export interface LeaderboardProvider {
  readonly partnerId: PartnerId;
  fetchLeaderboard(period: Period): Promise<Leaderboard>;
}

export interface Period {
  start: Date;
  end: Date;
}

export interface FreeBattleProgram {
  partnerId: PartnerId;
  /** PLACEHOLDER until the client supplies the real rules. */
  headline: string;
  requirement: string;
  reward: string;
  cadence: string;
  isPlaceholder: boolean;
}

export interface AffiliateReturn {
  /** Share of affiliate revenue returned to players. Always 100 here. */
  percentage: number;
  cadence: string;
  method: string;
  isPlaceholder: boolean;
}
