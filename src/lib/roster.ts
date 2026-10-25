import 'server-only';

import { fetchRoobetRows } from './roobet-stats';

/**
 * Everyone who has ever wagered under the code. Ported from the Fugroo build.
 *
 * The leaderboard asks Roobet for the current period. This asks for all of it,
 * because the question is different: not "who is winning" but "is this person
 * one of ours". Someone who played in March and not since is still under the
 * code.
 *
 * The endpoint only returns players **with wagering activity**. Somebody who
 * signed up ten minutes ago and has not placed a bet does not appear — which is
 * true as far as Roobet is concerned, and is why the refusal says to place a
 * bet rather than to check the spelling.
 */

/** Roobet launched well after this; it only has to predate every account. */
const SINCE = new Date(process.env.ROOBET_STATS_SINCE ?? '2020-01-01T00:00:00.000Z');

export interface RosterPlayer {
  username: string;
  wagered: number;
  weightedWagered: number;
}

interface Cached {
  at: number;
  players: Map<string, RosterPlayer>;
}

/**
 * Five minutes. The list changes slowly and the endpoint rate limits, so every
 * eligibility check in a giveaway hitting it live would be both wasteful and
 * the fastest way to get throttled mid-stream.
 */
const TTL = 5 * 60_000;
let cache: Cached | null = null;
let inflight: Promise<Cached> | null = null;

async function load(): Promise<Cached> {
  const rows = await fetchRoobetRows(SINCE, new Date());
  const players = new Map<string, RosterPlayer>();
  for (const row of rows) {
    if (!row.username) continue;
    // Keyed lower-case: Roobet is inconsistent about casing between its API and
    // its dashboard, and a player typing their own name will not match it either.
    players.set(row.username.trim().toLowerCase(), {
      username: row.username,
      wagered: row.wagered ?? 0,
      weightedWagered: row.weightedWagered ?? row.wagered ?? 0,
    });
  }
  return { at: Date.now(), players };
}

/** The roster, cached. `force` skips the age check but shares an in-flight request. */
export async function roster(force = false): Promise<Cached> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache;
  if (inflight) return inflight;
  inflight = load()
    .then((next) => {
      cache = next;
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export interface RosterCheck {
  found: boolean;
  player: RosterPlayer | null;
  /** When the list this answer came from was fetched. */
  checkedAt: number;
  error?: string;
}

export async function checkRoobet(username: string, force = false): Promise<RosterCheck> {
  const key = username.trim().toLowerCase();
  if (!key) return { found: false, player: null, checkedAt: Date.now() };
  try {
    const { players, at } = await roster(force);
    const player = players.get(key) ?? null;
    return { found: Boolean(player), player, checkedAt: at };
  } catch (err) {
    // A failed lookup is not "not under the code" and must not be reported as
    // one — that would refuse a legitimate player over our outage.
    return {
      found: false,
      player: null,
      checkedAt: Date.now(),
      error: err instanceof Error ? err.message : 'Lookup failed',
    };
  }
}
