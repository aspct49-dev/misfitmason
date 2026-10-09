/**
 * Domain types. No React, no fetch, no UI concerns — these are the shapes every
 * partner provider must normalise down to, so the leaderboard components never
 * learn which casino a row came from.
 */

export type PartnerId = 'roobet' | 'lootbox';

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
  /**
   * True when the board ranks on the operator's house-edge weighted figure
   * rather than the raw amount staked. Drives every "Wagered" label, because a
   * weighted number shown under a plain "Wagered" heading looks like a mistake
   * to anyone comparing it with their own account.
   */
  weighted: boolean;
  /** Plain-language explanation shown beside a weighted board, one point per entry. */
  weightingNote?: string[];
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

/** One slot challenge: a target multiplier at a fixed stake, for a fixed prize. */
export interface Challenge {
  id: string;
  game: string;
  provider: string;
  /** Operator-supplied slot tile, 3:4, from the asset pipeline. */
  art: string;
  /** The verb, e.g. "Spin into any bonus and hit" — the multiplier follows it. */
  requirement: string;
  multiplier: number;
  /** The stake the attempt must be made at, in dollars. */
  bet: number;
  prize: number;
  status: 'active' | 'claimed';
  /** Masked winner, set when status is 'claimed'. */
  claimedBy?: string;
}

export interface VipTransfer {
  headline: string;
  /** What the applicant must already have. */
  requirement: string;
  reward: string;
  cadence: string;
  /** PLACEHOLDER until the operator confirms the tiers. */
  isPlaceholder: boolean;
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

/** What every partner integration implements. Adding a casino = adding one of these. */
export interface LeaderboardProvider {
  readonly partnerId: PartnerId;
  fetchLeaderboard(period: Period): Promise<Leaderboard>;
}

export interface Period {
  start: Date;
  end: Date;
}

export interface AffiliateReturn {
  /** Share of affiliate revenue returned to players. Always 100 here. */
  percentage: number;
  cadence: string;
  method: string;
  isPlaceholder: boolean;
}
