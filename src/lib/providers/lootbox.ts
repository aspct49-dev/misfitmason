import { getPartner } from '../partners';
import { buildEntries } from './shared';
import { LOOTBOX_FIXTURE } from '../mock/lootbox';
import type { Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Lootbox has no affiliate API available to us yet, so this provider serves
 * fixtures. It is deliberately shaped exactly like the Shuffle provider: same
 * interface, same normalisation, same return type.
 *
 * When the real API arrives, replace the body of fetchLeaderboard with the HTTP
 * call, map the response into RawPlayer[], and flip `hasLiveApi` to true in
 * partners.ts. Nothing in the UI changes, and the MOCK badge disappears on its
 * own because it is driven by `source`.
 */
export const lootboxProvider: LeaderboardProvider = {
  partnerId: 'lootbox',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('lootbox');

    return {
      partnerId: 'lootbox',
      prizePool: partner.prizePool,
      entries: buildEntries(LOOTBOX_FIXTURE.players, partner.prizeTable),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock',
      stats: {
        players: LOOTBOX_FIXTURE.players.length,
        totalWagered: LOOTBOX_FIXTURE.players.reduce((sum, p) => sum + p.wagered, 0),
        topWager: LOOTBOX_FIXTURE.players[0]?.wagered ?? 0,
      },
      biggestHit: LOOTBOX_FIXTURE.biggestHit,
    };
  },
};
