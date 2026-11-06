import 'server-only';

import { getPartner } from '../partners';
import { buildEntries } from './shared';
import type { Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Rain.gg affiliate leaderboard.
 *
 * Reads `/v1/affiliates/leaderboard`, which takes any date range, rather than
 * `/affiliates/races`: no race is configured on rain.gg for this code, so the
 * periods and the split are this site's own (see PARTNERS.rain) and the board
 * resets on schedule with nothing to set up on Rain's side.
 *
 * Rain rate-limits the endpoint and asks for at least ten minutes of caching,
 * hence `revalidate: 600`. Do not lower it. The endpoint returns the top 50
 * only, which is far more than this board's player base.
 *
 * The key must never reach the browser, so this module is server-only.
 */

const ENDPOINT = 'https://api.rain.gg/v1/affiliates/leaderboard';
const REVALIDATE_SECONDS = 600;

interface RainRow {
  id: string;
  username: string;
  wagered: number;
  deposited?: number;
  avatar?: string;
}

function readKey(): string {
  // The local .env named it in lowercase; the conventional name wins if both exist.
  const key = process.env.RAIN_API_KEY ?? process.env.rain_api_key;
  if (!key) throw new Error('RAIN_API_KEY is not set');
  return key.trim();
}

export const rainProvider: LeaderboardProvider = {
  partnerId: 'rain',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('rain');

    const url = new URL(ENDPOINT);
    url.searchParams.set('type', 'wagered');
    url.searchParams.set('start_date', period.start.toISOString());
    // The next period's opening instant, as on Roobet: exactly the boundary
    // whether Rain reads the end as inclusive or exclusive.
    url.searchParams.set('end_date', new Date(period.end.getTime() + 1000).toISOString());

    const res = await fetch(url, {
      headers: { accept: 'application/json', 'x-api-key': readKey() },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      throw new Error(`Rain responded ${res.status}: ${await res.text()}`);
    }

    // `results` is null, not [], for a window nobody has wagered in.
    const body = (await res.json()) as { results: RainRow[] | null };
    if (body.results !== null && !Array.isArray(body.results)) {
      throw new Error('Rain returned an unexpected payload');
    }

    const active = (body.results ?? []).filter((row) => (row.wagered ?? 0) > 0);
    const sorted = [...active].sort((a, b) => b.wagered - a.wagered);

    return {
      partnerId: 'rain',
      prizePool: partner.prizePool,
      entries: buildEntries(
        // Avatars are deliberately not passed on: a player's own picture next
        // to a masked name would undo the masking.
        sorted.map((row) => ({ username: row.username, wagered: row.wagered })),
        partner.prizeTable,
      ),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      stats: {
        players: active.length,
        totalWagered: active.reduce((sum, row) => sum + row.wagered, 0),
        topWager: sorted.length ? sorted[0].wagered : 0,
      },
    };
  },
};
