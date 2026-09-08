import 'server-only';

import { getPartner } from '../partners';
import { withoutExcluded } from '../staff';
import { buildEntries } from './shared';
import type { Leaderboard, LeaderboardProvider, Period } from '../types';

/**
 * Lootbox Partner Data API — `POST /top-affiliate-wagers-by-period`.
 *
 * Unlike Shuffle, this endpoint takes a real time range, so the board matches
 * the calendar period the site advertises rather than a window configured
 * elsewhere.
 *
 * Two shape details worth knowing:
 *   - timestamps are Unix *seconds*, not milliseconds;
 *   - `totalWagered` arrives as a **string**, so it has to be parsed before any
 *     arithmetic. Summing it raw would concatenate.
 */

interface LootboxRow {
  username: string;
  avatar?: string;
  totalWagered: string;
  updatedAt?: string;
}

interface LootboxResponse {
  data: LootboxRow[] | null;
  errors: unknown;
}

/** How many rows to request. Comfortably above any prize table we run. */
const REQUEST_ROWS = 50;

function readConfig(): { url: string; key: string } {
  const base = process.env.LOOTBOX_API_URL;
  const key = process.env.LOOTBOX_API_KEY;
  if (!base) throw new Error('LOOTBOX_API_URL is not set');
  if (!key) throw new Error('LOOTBOX_API_KEY is not set');
  return { url: `${base.replace(/\/+$/, '')}/top-affiliate-wagers-by-period`, key };
}

export const lootboxProvider: LeaderboardProvider = {
  partnerId: 'lootbox',

  async fetchLeaderboard(period: Period): Promise<Leaderboard> {
    const partner = getPartner('lootbox');
    const { url, key } = readConfig();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTimestamp: Math.floor(period.start.getTime() / 1000),
        endTimestamp: Math.floor(period.end.getTime() / 1000),
        numUsers: REQUEST_ROWS,
      }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Lootbox responded ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as LootboxResponse;
    if (body.errors) {
      throw new Error(`Lootbox returned errors: ${JSON.stringify(body.errors)}`);
    }

    const rows = withoutExcluded(body.data ?? [], (row) => row.username);

    // Parsed once here so nothing downstream has to remember it is a string.
    const players = rows.map((row) => ({
      username: row.username,
      wagered: Number.parseFloat(row.totalWagered) || 0,
      tierBadgeUrl: row.avatar,
    }));

    const ranked = [...players].sort((a, b) => b.wagered - a.wagered);

    return {
      partnerId: 'lootbox',
      prizePool: partner.prizePool,
      entries: buildEntries(ranked, partner.prizeTable),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      stats: {
        players: ranked.length,
        totalWagered: ranked.reduce((sum, p) => sum + p.wagered, 0),
        topWager: ranked.length ? ranked[0].wagered : 0,
      },
    };
  },
};
