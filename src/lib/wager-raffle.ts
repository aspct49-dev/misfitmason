import 'server-only';

import { randomInt } from 'node:crypto';

import { maskUsername, periodFor, previousPeriodFor } from './format';
import { PARTNERS } from './partners';
import { fetchRoobetRows } from './roobet-stats';
import { isExcludedPlayer } from './staff';
import { mutateJson, readJson } from './store';
import type { Period } from './types';

/**
 * The $100 bi-weekly raffle: tickets earned by wagering, drawn when the
 * leaderboard period closes.
 *
 * Every $75 of Roobet's **weighted** wager in a period is one ticket — the same
 * figure the leaderboard ranks on, so the two can never disagree about who
 * played. Weighted for the same reason: on the raw stake, dice farms tickets at
 * a 1% edge.
 *
 * Distinct from the chat raffle picker (lib/giveaway.ts), which draws from
 * people typing a keyword in Kick chat. This one is drawn from play.
 *
 * It runs on the leaderboard's own schedule, so "this period" means the same
 * thing on both pages and the draw happens at the same close.
 */

export const WAGER_RAFFLE = {
  ticketEvery: 75,
  /** Place 1 first. One win per player per draw. */
  prizes: [75, 25],
  partnerId: 'roobet' as const,
  /**
   * The opening instant of the first period the raffle ran for (client
   * decision, 2026-10-29: it starts with the period live when it was
   * announced, 28 Oct – 14 Nov). Earlier periods are never drawable — paying a
   * raffle nobody was told about would be a payout out of nowhere.
   */
  firstPeriodStart: '2026-10-28T12:00:00.000Z',
};

const firstStart = () => new Date(WAGER_RAFFLE.firstPeriodStart).getTime();

export const WAGER_RAFFLE_POOL = WAGER_RAFFLE.prizes.reduce((s, p) => s + p, 0);

const schedule = () => PARTNERS[WAGER_RAFFLE.partnerId].schedule;

export function currentRafflePeriod() {
  return periodFor(schedule());
}

/** The last closed period the raffle ran for, or null before its first close. */
export function lastClosedRafflePeriod() {
  const previous = previousPeriodFor(schedule());
  if (!previous || previous.start.getTime() < firstStart()) return null;
  return previous;
}

/* ------------------------------------------------------------- standings */

export interface RaffleEntrant {
  /** Roobet's own spelling. Server-side only: pages show `masked`. */
  username: string;
  masked: string;
  weighted: number;
  tickets: number;
}

export interface RaffleStandings {
  entrants: RaffleEntrant[];
  totalTickets: number;
}

/**
 * Everyone holding at least one ticket for a period, most tickets first.
 *
 * Cached per window for a minute, like the leaderboard: one Roobet call serves
 * every visitor, and the endpoint rate limits.
 */
const cache = new Map<string, { at: number; value: RaffleStandings }>();
const TTL = 60_000;

export async function raffleStandings(period: Period): Promise<RaffleStandings> {
  const key = `${period.start.toISOString()}|${period.end.toISOString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const rows = await fetchRoobetRows(period.start, new Date(period.end.getTime() + 1000));
  const entrants = rows
    .filter((r) => r.username && !isExcludedPlayer(r.username))
    .map((r) => {
      const weighted = r.weightedWagered ?? r.wagered ?? 0;
      return {
        username: r.username,
        masked: maskUsername(r.username),
        weighted,
        tickets: Math.floor(weighted / WAGER_RAFFLE.ticketEvery),
      };
    })
    .filter((e) => e.tickets > 0)
    .sort((a, b) => b.tickets - a.tickets || b.weighted - a.weighted);

  const value = { entrants, totalTickets: entrants.reduce((s, e) => s + e.tickets, 0) };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/* ------------------------------------------------------------------ draws */

export interface RaffleWinner {
  place: number;
  username: string;
  masked: string;
  tickets: number;
  prize: number;
  /** The ticket number drawn, out of the tickets left in the pool. Kept for the record. */
  ticket: number;
  poolSize: number;
}

export interface RaffleDraw {
  periodStart: string;
  periodEnd: string;
  drawnAt: string;
  entrants: number;
  totalTickets: number;
  winners: RaffleWinner[];
}

interface Store {
  draws: RaffleDraw[];
}

const FILE = 'wager-raffle.json';
const EMPTY: Store = { draws: [] };

export async function listDraws(): Promise<RaffleDraw[]> {
  const { draws } = await readJson<Store>(FILE, EMPTY);
  return [...draws].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
}

export async function drawFor(period: Period): Promise<RaffleDraw | undefined> {
  const { draws } = await readJson<Store>(FILE, EMPTY);
  return draws.find((d) => d.periodStart === period.start.toISOString());
}

/**
 * Draws a closed period's winners — once.
 *
 * If the period has already been drawn, the saved draw comes back unchanged:
 * the cron, a retried cron and an admin pressing "Draw" all reach the same
 * result, and a draw cannot be re-rolled by asking again. Each place is a
 * ticket picked uniformly from the tickets still in the pool (crypto.randomInt,
 * not Math.random), and a winner's tickets leave the pool before the next
 * place, so nobody wins twice.
 *
 * Refuses an open period: drawing before the close would draw from play that
 * has not finished.
 */
export async function drawRaffle(
  period: Period,
): Promise<{ ok: true; draw: RaffleDraw; fresh: boolean } | { ok: false; error: string }> {
  if (period.end.getTime() > Date.now()) return { ok: false, error: 'That period has not closed yet.' };
  if (period.start.getTime() < firstStart()) {
    return { ok: false, error: 'The raffle had not started in that period.' };
  }

  const existing = await drawFor(period);
  if (existing) return { ok: true, draw: existing, fresh: false };

  const { entrants, totalTickets } = await raffleStandings(period);

  const pool = entrants.map((e) => ({ ...e }));
  const winners: RaffleWinner[] = [];
  WAGER_RAFFLE.prizes.forEach((prize, i) => {
    const remaining = pool.reduce((s, e) => s + e.tickets, 0);
    if (remaining === 0) return;
    const ticket = randomInt(remaining);
    let acc = 0;
    const idx = pool.findIndex((e) => (acc += e.tickets) > ticket);
    const [won] = pool.splice(idx, 1);
    winners.push({
      place: i + 1,
      username: won.username,
      masked: won.masked,
      tickets: won.tickets,
      prize,
      ticket: ticket + 1,
      poolSize: remaining,
    });
  });

  const draw: RaffleDraw = {
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    drawnAt: new Date().toISOString(),
    entrants: entrants.length,
    totalTickets,
    winners,
  };

  // Re-checked inside the write: two callers racing the same close keep the
  // first draw rather than overwriting it with a second.
  let saved = draw;
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const already = s.draws.find((d) => d.periodStart === draw.periodStart);
    if (already) {
      saved = already;
      return;
    }
    s.draws.push(draw);
  });
  return { ok: true, draw: saved, fresh: saved === draw };
}
