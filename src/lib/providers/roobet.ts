import 'server-only';

import { getPartner } from '../partners';
import { withoutExcluded } from '../staff';
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

/** Roobet takes plain ISO dates, not full timestamps. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The upper bound to send, which is the day *after* the period ends.
 *
 * Roobet's window is half-open: `startDate` is inclusive, but `endDate` means
 * "up to 00:00 on this date" and excludes the day itself. Sending the last day
 * of the period would therefore throw away that whole day's wagering —
 * silently, and on the one day that matters most, because the board settles
 * that night.
 *
 * `period.end` is 23:59:59 on the last day, so a second past it lands at 00:00
 * the next day and `isoDate` rounds to exactly the bound this endpoint wants.
 */
function exclusiveEnd(d: Date): string {
  return isoDate(new Date(d.getTime() + 1000));
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
    url.searchParams.set('startDate', isoDate(period.start));
    url.searchParams.set('endDate', exclusiveEnd(period.end));

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

    // Excluded before ranking *and* before the totals, so staff play does not
    // inflate the board stats either.
    const rows = withoutExcluded(payload, (row) => row.username);

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
          // Carried through but not rendered — on a masked name it would be
          // the only identifying detail left.
          favouriteGame: row.favoriteGameTitle,
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
