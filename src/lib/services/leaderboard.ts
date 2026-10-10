import 'server-only';

import { periodFor } from '../format';
import { getPartner, PARTNER_ORDER } from '../partners';
import { lootboxProvider } from '../providers/lootbox';
import { roobetProvider } from '../providers/roobet';
import { buildEntries } from '../providers/shared';
import type { Leaderboard, LeaderboardProvider, PartnerId, Period } from '../types';

/**
 * The only leaderboard entry point the app uses. Components ask this for a
 * board and never touch a provider, so which casino is live and which is
 * fixtures stays an implementation detail.
 */

const PROVIDERS: Record<PartnerId, LeaderboardProvider> = {
  roobet: roobetProvider,
  lootbox: lootboxProvider,
};

/**
 * What a partner's board looks like when the live call failed.
 *
 * Deliberately empty rather than seeded with fixtures. A hardcoded row renders
 * as a real player with a real-looking figure, so a transient outage would show
 * frozen standings as though they were current — worse than showing none. Every
 * place comes back unclaimed and the UI carries the "temporarily unavailable"
 * notice above it.
 */
function fallbackFor(partnerId: PartnerId, period: Period, error: string): Leaderboard {
  const partner = getPartner(partnerId);
  return {
    partnerId,
    prizePool: partner.prizePool,
    entries: buildEntries([], partner.prizeTable),
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'mock',
    stats: { players: 0, totalWagered: 0, topWager: 0 },
    error,
  };
}

export async function getLeaderboard(
  partnerId: PartnerId,
  period?: Period,
): Promise<Leaderboard> {
  const partner = getPartner(partnerId);
  const scheduled = periodFor(partner.schedule);
  const window = period ?? scheduled;

  /* A board that has not opened is not an empty board: calling the API for a
     window that has not begun would return nothing and render as though a live
     competition had no entrants. The UI shows the opening date instead. */
  if (!period && scheduled.upcoming) {
    return {
      ...fallbackFor(partnerId, window, ''),
      source: 'live',
      error: undefined,
      upcoming: true,
    };
  }

  try {
    return await PROVIDERS[partnerId].fetchLeaderboard(window);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[leaderboard] ${partnerId} provider failed:`, message);
    return fallbackFor(partnerId, window, message);
  }
}

/** Each partner on its own schedule, so the two boards can be cut differently. */
export async function getAllLeaderboards(): Promise<Record<PartnerId, Leaderboard>> {
  const boards = await Promise.all(PARTNER_ORDER.map((id) => getLeaderboard(id)));
  return Object.fromEntries(
    PARTNER_ORDER.map((id, i) => [id, boards[i]]),
  ) as Record<PartnerId, Leaderboard>;
}
