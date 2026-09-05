import 'server-only';

import { getPartner } from '../partners';
import { maskUsername } from '../format';
import { buildEntries } from './shared';
import type { BiggestHit, Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Roobet affiliate stats. Server-only: the bearer token must never reach the
 * browser, so nothing in `src/components` may import this module.
 *
 * The affiliate userId is not a separate credential — it is the `id` claim
 * inside the JWT itself, which is how the token identifies which affiliate's
 * players you are allowed to read.
 */

const ENDPOINT = 'https://roobetconnect.com/affiliate/v2/stats';

/** Exactly the fields Roobet returns that we care about. */
interface RoobetRow {
  uid: string;
  username: string;
  wagered: number;
  weightedWagered: number;
  favoriteGameTitle?: string;
  rankLevelImage?: string;
  highestMultiplier?: {
    multiplier: number;
    wagered: number;
    payout: number;
    gameTitle: string;
  };
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

function biggestHitFrom(rows: RoobetRow[]): BiggestHit | undefined {
  let best: BiggestHit | undefined;
  for (const row of rows) {
    const hit = row.highestMultiplier;
    if (!hit || !hit.multiplier) continue;
    if (!best || hit.multiplier > best.multiplier) {
      best = {
        username: maskUsername(row.username),
        multiplier: hit.multiplier,
        gameTitle: hit.gameTitle,
        wagered: hit.wagered,
        payout: hit.payout,
      };
    }
  }
  return best;
}

export const roobetProvider: LeaderboardProvider = {
  partnerId: 'roobet',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('roobet');
    const token = readToken();

    const url = new URL(ENDPOINT);
    url.searchParams.set('userId', affiliateIdFromToken(token));
    url.searchParams.set('startDate', period.start.toISOString());
    url.searchParams.set('endDate', period.end.toISOString());
    url.searchParams.set('timestamp', Date.now().toString());

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // Roobet updates hourly; a minute of staleness costs nothing and keeps us
      // well inside the rate limit no matter how many people load the page.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Roobet responded ${res.status}: ${await res.text()}`);
    }

    const rows = (await res.json()) as RoobetRow[];

    // Client decision (2026-09-05): rank on raw wagered, not weightedWagered.
    const ranked = [...rows].sort((a, b) => b.wagered - a.wagered);

    return {
      partnerId: 'roobet',
      prizePool: partner.prizePool,
      entries: buildEntries(
        ranked.map((row) => ({
          username: maskUsername(row.username),
          wagered: row.wagered,
          favouriteGame: row.favoriteGameTitle,
          tierBadgeUrl: row.rankLevelImage,
        })),
        partner.prizeTable,
      ),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      // Across everyone under the code, not only the paying places — the panel
      // is meant to show how contested the board is.
      stats: {
        players: rows.length,
        totalWagered: rows.reduce((sum, r) => sum + (r.wagered || 0), 0),
        topWager: ranked.length ? ranked[0].wagered : 0,
      },
      biggestHit: biggestHitFrom(rows),
    };
  },
};
