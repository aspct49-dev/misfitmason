/**
 * Domain types. No React, no fetch, no UI concerns — these are the shapes every
 * partner provider must normalise down to, so the leaderboard components never
 * learn which casino a row came from.
 */

export type PartnerId = 'roobet';

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
  /** How this partner's periods are cut. */
  schedule: Schedule;
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
  /** Set when the board has not opened yet; `periodStart` is the opening date. */
  upcoming?: boolean;
  /** Set on a closed period's board: final standings, no countdown. */
  final?: boolean;
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

/** What every partner integration implements. Adding a casino = adding one of these. */
export interface LeaderboardProvider {
  readonly partnerId: PartnerId;
  fetchLeaderboard(period: Period): Promise<Leaderboard>;
}

export interface Period {
  start: Date;
  end: Date;
}

/**
 * How a partner's periods are cut.
 *
 * Two shapes because a board's periods are not always calendar-shaped: Roobet
 * starts on a date the client picked and runs a true fortnight from it, while
 * half-months are what a board pinned to the 1st and the 16th wants.
 */
export type Schedule =
  | { kind: 'half-month' }
  /**
   * Fortnights counted from `anchor`, which is also the day the board opens.
   *
   * The boundary is a wall-clock time in `timeZone`, not a fixed UTC instant:
   * a board advertised as opening at 8am has to keep opening at 8am after the
   * clocks change, which a fixed offset would not.
   */
  | {
      kind: 'rolling';
      /** Opening day, YYYY-MM-DD, read in `timeZone`. */
      anchor: string;
      days: number;
      /** 24-hour HH:mm in `timeZone`. */
      time: string;
      /** IANA zone, e.g. 'America/New_York'. */
      timeZone: string;
    }
  /**
   * Periods that break on fixed days of every month — the 14th and the 28th,
   * say — at a wall-clock time in `timeZone`.
   *
   * For a deal that runs month to month from a day other than the 1st: two
   * breaks a month keep every period inside one deal month, which fortnights
   * cannot (a month is not 28 days, so they drift off the deal's start).
   * Periods come out at 14 to 17 days rather than exactly 14.
   */
  | {
      kind: 'monthly-days';
      /** Days of the month the periods break on, ascending, each 1–28. */
      days: number[];
      /** The board's first opening, YYYY-MM-DD in `timeZone`; before it, upcoming. */
      opens: string;
      time: string;
      timeZone: string;
    };
