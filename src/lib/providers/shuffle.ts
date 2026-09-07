import 'server-only';

import { getPartner } from '../partners';
import { maskUsername } from '../format';
import { buildEntries } from './shared';
import type { Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Shuffle affiliate wager stats.
 *
 * The whole endpoint URL is the credential — the UUID in its path is what
 * authorises the call — so it lives in the environment and this module is
 * server-only. Nothing under src/components may import it.
 *
 * Two constraints the API imposes on us:
 *
 *   1. It takes no parameters. Passing any date range returns HTTP 500, so the
 *      reporting window is whatever Shuffle has configured on their side. The
 *      `period` argument is therefore used only for the labels and countdown we
 *      display; it cannot filter the data.
 *   2. It is aggressively rate limited — a handful of rapid calls returns
 *      TOO_MANY_REQUEST. The cache below is what keeps us under that, so do not
 *      lower the revalidate window.
 */

/** Exactly what Shuffle returns per player. No avatars, games or multipliers. */
interface ShuffleRow {
  username: string;
  wagerAmount: number;
  weightedWagerAmount: number;
}

function readEndpoint(): string {
  const url = process.env.SHUFFLE_WAGER_URL;
  if (!url) throw new Error('SHUFFLE_WAGER_URL is not set');
  return url.trim();
}

export const shuffleProvider: LeaderboardProvider = {
  partnerId: 'shuffle',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('shuffle');

    const res = await fetch(readEndpoint(), {
      headers: { accept: 'application/json' },
      // Shuffle rate limits hard; a minute of staleness costs nothing and keeps
      // any amount of traffic down to one upstream call per minute.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Shuffle responded ${res.status}: ${await res.text()}`);
    }

    const rows = (await res.json()) as ShuffleRow[];
    if (!Array.isArray(rows)) {
      throw new Error('Shuffle returned an unexpected payload');
    }

    // Ranked on raw wagered, matching the stated rules. Shuffle also returns a
    // house-edge weighted figure, which is what a switch to weighted ranking
    // would use.
    const ranked = [...rows].sort((a, b) => b.wagerAmount - a.wagerAmount);

    return {
      partnerId: 'shuffle',
      prizePool: partner.prizePool,
      entries: buildEntries(
        ranked.map((row) => ({
          username: maskUsername(row.username),
          wagered: row.wagerAmount,
        })),
        partner.prizeTable,
      ),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      stats: {
        players: rows.length,
        totalWagered: rows.reduce((sum, r) => sum + (r.wagerAmount || 0), 0),
        topWager: ranked.length ? ranked[0].wagerAmount : 0,
      },
      // Shuffle publishes no per-bet detail, so there is no biggest-hit panel
      // on this board. The field is optional and the UI already omits it.
    };
  },
};
