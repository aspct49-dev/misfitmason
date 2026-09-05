import 'server-only';

import { currentPeriod } from '../format';
import { getPartner, PARTNER_ORDER } from '../partners';
import { roobetProvider } from '../providers/roobet';
import { lootboxProvider } from '../providers/lootbox';
import { buildEntries } from '../providers/shared';
import { ROOBET_FALLBACK } from '../mock/roobet';
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

/** Fixtures for a partner whose live call failed, so a page never renders empty. */
function fallbackFor(partnerId: PartnerId, period: Period, error: string): Leaderboard {
  const partner = getPartner(partnerId);
  return {
    partnerId,
    prizePool: partner.prizePool,
    entries: buildEntries(partnerId === 'roobet' ? ROOBET_FALLBACK : [], partner.prizeTable),
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
  period: Period = currentPeriod(),
): Promise<Leaderboard> {
  try {
    return await PROVIDERS[partnerId].fetchLeaderboard(period);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[leaderboard] ${partnerId} provider failed:`, message);
    return fallbackFor(partnerId, period, message);
  }
}

export async function getAllLeaderboards(
  period: Period = currentPeriod(),
): Promise<Record<PartnerId, Leaderboard>> {
  const boards = await Promise.all(
    PARTNER_ORDER.map((id) => getLeaderboard(id, period)),
  );
  return Object.fromEntries(
    PARTNER_ORDER.map((id, i) => [id, boards[i]]),
  ) as Record<PartnerId, Leaderboard>;
}
