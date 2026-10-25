import 'server-only';

import { affiliateIdFromToken } from './providers/roobet';

/**
 * Raw rows from Roobet's affiliate stats, for any window.
 *
 * The leaderboard provider asks for one period and shapes it into a board.
 * Everything else — the roster check, a player's progress towards a VIP reward —
 * needs the same rows for a different window and no shaping, so it comes here.
 *
 * Bounds go as full ISO instants: Roobet honours time of day (verified
 * 2026-10-25), and the site's periods start at 8am Eastern, not midnight.
 */

const ENDPOINT = 'https://roobetconnect.com/affiliate/v2/stats';

export interface RoobetRow {
  uid: string;
  username: string;
  wagered: number;
  weightedWagered?: number;
  rankLevelImage?: string;
}

export async function fetchRoobetRows(start: Date, end: Date): Promise<RoobetRow[]> {
  const token = process.env.ROOBET_API_TOKEN?.trim();
  if (!token) throw new Error('ROOBET_API_TOKEN is not set');

  const url = new URL(ENDPOINT);
  url.searchParams.set('userId', affiliateIdFromToken(token));
  url.searchParams.set('startDate', start.toISOString());
  url.searchParams.set('endDate', end.toISOString());

  const res = await fetch(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    // Callers cache in memory with their own lifetimes; a framework cache on top
    // would hold a stale roster past the point the caller asked to refresh it.
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Roobet responded ${res.status}: ${await res.text()}`);

  const rows = (await res.json()) as RoobetRow[];
  if (!Array.isArray(rows)) throw new Error('Roobet returned an unexpected payload');
  return rows;
}
