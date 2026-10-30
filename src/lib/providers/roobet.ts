import 'server-only';

import { getPartner } from '../partners';
import { buildEntries } from './shared';
import type { Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Roobet affiliate stats.
 *
 * The bearer token must never reach the browser, so this module is server-only
 * and nothing under src/components may import it. There is no separate
 * affiliate id to configure: the `id` claim inside the JWT is what identifies
 * whose players the token may read, so it is derived from the token itself and
 * cannot drift out of sync with it.
 */

const ENDPOINT = 'https://roobetconnect.com/affiliate/v2/stats';

/** The fields we use out of a Roobet stats row. */
interface RoobetRow {
  uid: string;
  username: string;
  wagered: number;
  weightedWagered?: number;
  favoriteGameTitle?: string;
  rankLevelImage?: string;
}

function readToken(): string {
  const token = process.env.ROOBET_API_TOKEN;
  if (!token) throw new Error('ROOBET_API_TOKEN is not set');
  return token.trim();
}

/** The affiliate id lives in the token payload; there is nothing to configure. */
export function affiliateIdFromToken(token: string): string {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('ROOBET_API_TOKEN is not a JWT');
  const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!json.id) throw new Error('ROOBET_API_TOKEN has no id claim');
  return json.id as string;
}

/**
 * The window to send, as full ISO timestamps.
 *
 * Roobet honours the time of day, not just the date — verified against the live
 * API on 2026-10-25: moving the start from 00:00Z to 12:00Z dropped two players,
 * and moving the end from midnight to noon changed the weighted total by over
 * $1,200. That matters because the board opens and closes at 8am Eastern, not
 * at midnight. Sending dates alone (as an earlier version did) counted twelve
 * hours of pre-launch play and, worse, cut off the final twelve hours of every
 * period — the last morning, when standings are decided.
 *
 * The end is sent as the next period's opening instant, a second past
 * `period.end`, so the bound is exactly the boundary whether Roobet treats it as
 * inclusive or exclusive.
 */
function window(period: Period): { start: string; end: string } {
  return {
    start: period.start.toISOString(),
    end: new Date(period.end.getTime() + 1000).toISOString(),
  };
}

/**
 * The figure the board ranks on, displays and totals: Roobet's RTP-weighted
 * number, not the raw stake (client decision, 2026-10-08).
 *
 * Falls back to the raw stake only where a row omits the weight — a row with no
 * weighted figure is better ranked on what it does carry than dropped to zero.
 */
function ranked(row: RoobetRow): number {
  return row.weightedWagered ?? row.wagered ?? 0;
}

export const roobetProvider: LeaderboardProvider = {
  partnerId: 'roobet',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('roobet');
    const token = readToken();

    const url = new URL(ENDPOINT);
    url.searchParams.set('userId', affiliateIdFromToken(token));
    const bounds = window(period);
    url.searchParams.set('startDate', bounds.start);
    url.searchParams.set('endDate', bounds.end);

    const res = await fetch(url, {
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      // One upstream call a minute however much traffic arrives. Roobet
      // updates hourly, so a minute of staleness is invisible to a player.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Roobet responded ${res.status}: ${await res.text()}`);
    }

    const payload = (await res.json()) as RoobetRow[];
    if (!Array.isArray(payload)) {
      throw new Error('Roobet returned an unexpected payload');
    }

    // Staff are ranked like anyone else here (client decision, 2026-10-30);
    // lib/staff.ts still keeps them out of the raffle and VIP rewards.
    const rows = payload;

    // Registered but idle accounts come back at zero. They are not standings,
    // and a row reading $0 tells a reader nothing about the race.
    const active = rows.filter((row) => ranked(row) > 0);
    const sorted = [...active].sort((a, b) => ranked(b) - ranked(a));

    return {
      partnerId: 'roobet',
      prizePool: partner.prizePool,
      entries: buildEntries(
        sorted.map((row) => ({
          username: row.username,
          wagered: ranked(row),
          // Deliberately not passed on. The table renders a favourite game
          // when one is present, and on a masked name it is the one detail
          // that could identify the player — so it never reaches the board.
          tierBadgeUrl: row.rankLevelImage,
        })),
        partner.prizeTable,
      ),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      stats: {
        players: active.length,
        totalWagered: active.reduce((sum, row) => sum + ranked(row), 0),
        topWager: sorted.length ? ranked(sorted[0]) : 0,
      },
    };
  },
};
