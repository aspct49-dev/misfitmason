/** Formatting and masking. Shared by providers and components. */

import type { Schedule } from './types';

/**
 * Usernames are masked to their last four characters — the convention across
 * casino affiliate leaderboards, and the reason providers never hand a full
 * name to the UI.
 */
export function maskUsername(name: string | null | undefined): string {
  if (!name) return '****';
  if (name.length <= 4) return '*'.repeat(4) + name;
  return '*'.repeat(Math.min(name.length - 4, 8)) + name.slice(-4);
}

/** Wagers run to five figures; the cents are noise. */
export function formatMoney(n: number, opts: { cents?: boolean } = {}): string {
  // A big multiplier is usually hit off a tiny stake — a 138× on a third of a
  // cent rounds to "$0.00", which reads as broken rather than as impressive.
  if (opts.cents && n > 0 && n < 0.01) {
    return '$' + n.toFixed(4).replace(/0+$/, '');
  }
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: opts.cents ? 2 : 0,
      maximumFractionDigits: opts.cents ? 2 : 0,
    })
  );
}

export function formatMultiplier(n: number): string {
  return (n >= 100 ? Math.round(n) : Number(n.toFixed(2))).toLocaleString('en-US') + '×';
}

/**
 * The current leaderboard period: the 1st to the 15th, or the 16th to the end
 * of the month, both at 00:00 UTC.
 *
 * Half-months rather than rolling fortnights, so a period never straddles a
 * month boundary and the reset dates are the same every month. Everything is
 * UTC because the casino reports in UTC; deriving it from the viewer's clock
 * would also render one string on the server and another in the browser.
 */
export function currentPeriod(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const secondHalf = now.getUTCDate() > 15;

  const start = new Date(Date.UTC(year, month, secondHalf ? 16 : 1, 0, 0, 0));
  // One second before the next period opens, so the two never overlap.
  const end = secondHalf
    ? new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - 1000)
    : new Date(Date.UTC(year, month, 16, 0, 0, 0) - 1000);

  return { start, end };
}

/**
 * Fortnights counted from an anchor date.
 *
 * A true two weeks, unlike the half-months: periods land on different dates
 * each month, which is the trade for every one being the same length. Before
 * the anchor there is no period at all — the caller decides what to show, and
 * for a board that has not opened that is an opening date, not standings.
 */
export function rollingPeriod(anchorIso: string, days: number, now: Date = new Date()) {
  const anchor = new Date(anchorIso);
  const length = days * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - anchor.getTime();

  if (elapsed < 0) {
    // The first period, which has not started: start is the opening date.
    return { start: anchor, end: new Date(anchor.getTime() + length - 1000), upcoming: true };
  }

  const index = Math.floor(elapsed / length);
  const start = new Date(anchor.getTime() + index * length);
  return { start, end: new Date(start.getTime() + length - 1000), upcoming: false };
}

/** The period a partner is in right now, by its own schedule. */
export function periodFor(schedule: Schedule, now: Date = new Date()) {
  if (schedule.kind === 'rolling') {
    return rollingPeriod(schedule.anchor, schedule.days, now);
  }
  return { ...currentPeriod(now), upcoming: false };
}

/** e.g. "1 – 15 OCTOBER 2026", or "14 OCT – 27 OCT 2026" across a month boundary. */
export function periodLabel(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);

  const monthOf = (d: Date, long: boolean) =>
    d
      .toLocaleString('en-US', { month: long ? 'long' : 'short', timeZone: 'UTC' })
      .toUpperCase();

  // A fortnight can straddle a month, and "28 – 10 NOVEMBER" would be a lie, so
  // both months are named when they differ.
  if (from.getUTCMonth() !== to.getUTCMonth()) {
    return `${from.getUTCDate()} ${monthOf(from, false)} – ${to.getUTCDate()} ${monthOf(to, false)} ${to.getUTCFullYear()}`;
  }

  return `${from.getUTCDate()} – ${to.getUTCDate()} ${monthOf(to, true)} ${to.getUTCFullYear()}`;
}
