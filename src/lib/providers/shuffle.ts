import 'server-only';

import { getPartner } from '../partners';
import { withoutExcluded } from '../staff';
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

/**
 * A month-start snapshot of the feed, read from SHUFFLE_BASELINE.
 *
 * Shuffle's totals never reset: the endpoint takes no date range (any date
 * parameter is either rejected with a 500 or silently ignored — both confirmed
 * against the live API), and the figures it returns are cumulative since the
 * affiliate link opened. So a player who stopped wagering in September would
 * otherwise keep their place on the October board for ever.
 *
 * Subtracting a snapshot taken at 00:00 on the 1st turns the cumulative feed
 * into a period one. `period` guards it: a baseline from the wrong month is
 * ignored rather than applied, because subtracting last month's snapshot twice
 * would understate the board and nobody would see an error.
 */
interface ShuffleBaseline {
  /** The month the snapshot opens, as YYYY-MM. */
  period: string;
  /** Lowercased username to that player's cumulative totals at the snapshot. */
  players: Record<string, { wagered: number; weighted: number }>;
}

function periodKey(period: Period): string {
  return period.start.toISOString().slice(0, 7);
}

function readBaseline(period: Period): ShuffleBaseline['players'] | null {
  const raw = process.env.SHUFFLE_BASELINE?.trim();
  if (!raw) {
    console.warn(
      '[shuffle] SHUFFLE_BASELINE is not set — the board is showing cumulative totals, not this period.',
    );
    return null;
  }

  let parsed: ShuffleBaseline;
  try {
    parsed = JSON.parse(raw) as ShuffleBaseline;
  } catch {
    console.warn('[shuffle] SHUFFLE_BASELINE is not valid JSON — ignoring it.');
    return null;
  }

  const key = periodKey(period);
  if (parsed.period !== key) {
    console.warn(
      `[shuffle] SHUFFLE_BASELINE is for ${parsed.period} but the period is ${key} — ignoring it. Run scripts/shuffle-baseline.mjs and update the variable.`,
    );
    return null;
  }

  return parsed.players ?? null;
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

    const payload = (await res.json()) as ShuffleRow[];
    if (!Array.isArray(payload)) {
      throw new Error('Shuffle returned an unexpected payload');
    }

    // Excluded before ranking *and* before the totals, so staff play does not
    // inflate the board stats either.
    const rows = withoutExcluded(payload, (row) => row.username);

    // Cumulative totals minus the month-start snapshot = this period's play.
    // Without a usable baseline the raw figures stand, which is wrong but
    // visible; silently showing zeroes would look like nobody had played.
    const baseline = readBaseline(period);
    const periodRows = rows.map((row) => {
      const before = baseline?.[row.username.trim().toLowerCase()];
      if (!before) return row;
      return {
        username: row.username,
        // A player can only ever wager more, so a negative result means the
        // baseline is wrong rather than that they un-wagered. Clamp at zero.
        wagerAmount: Math.max(0, row.wagerAmount - before.wagered),
        weightedWagerAmount: Math.max(0, row.weightedWagerAmount - before.weighted),
      };
    });

    // Players who have not wagered this period are dropped, so the board and
    // its player count describe the period rather than the sign-up list.
    const active = baseline ? periodRows.filter((row) => row.weightedWagerAmount > 0) : periodRows;

    // Ranked on the house-edge weighted figure (client decision, 2026-09-14),
    // not the raw stake. Raw ranking let low-edge play buy prize places: at the
    // switch, two of the three paying places changed hands. The weighted value
    // is what is displayed and totalled as well, so the board never shows one
    // number while ranking on another.
    const ranked = [...active].sort((a, b) => b.weightedWagerAmount - a.weightedWagerAmount);

    return {
      partnerId: 'shuffle',
      prizePool: partner.prizePool,
      entries: buildEntries(
        ranked.map((row) => ({ username: row.username, wagered: row.weightedWagerAmount })),
        partner.prizeTable,
      ),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'live',
      stats: {
        players: active.length,
        totalWagered: active.reduce((sum, r) => sum + (r.weightedWagerAmount || 0), 0),
        topWager: ranked.length ? ranked[0].weightedWagerAmount : 0,
      },
      // Shuffle publishes no per-bet detail, so there is no biggest-hit panel
      // on this board. The field is optional and the UI already omits it.
    };
  },
};
