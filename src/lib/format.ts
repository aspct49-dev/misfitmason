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
/** How far `timeZone` is from UTC at that instant, in milliseconds. */
function zoneOffset(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

/**
 * The UTC instant of a wall-clock time in a zone.
 *
 * Twice, because the offset depends on the instant we are trying to find: the
 * first pass is a guess made at UTC, the second corrects it using the offset in
 * force at that guess. One pass is wrong by an hour either side of a clock
 * change, which is exactly when a period boundary is worth getting right.
 */
export function zonedInstant(
  y: number,
  m: number,
  d: number,
  hours: number,
  minutes: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(y, m, d, hours, minutes);
  const firstPass = new Date(guess - zoneOffset(new Date(guess), timeZone));
  return new Date(guess - zoneOffset(firstPass, timeZone));
}

/**
 * Fortnights counted from an anchor day, each starting at the same wall-clock
 * time in the schedule's own zone.
 *
 * Boundaries are computed by adding whole days to the anchor *date* and then
 * resolving the time in the zone, rather than adding 14x24h to an instant. The
 * two differ by an hour across a clock change, and the first way is the one
 * that keeps a board advertised as opening at 8am opening at 8am.
 *
 * Before the anchor there is no period yet — the caller decides what to show,
 * and for a board that has not opened that is an opening date, not standings.
 */
export function rollingPeriod(
  anchorDate: string,
  days: number,
  time: string,
  timeZone: string,
  now: Date = new Date(),
) {
  const [y, m, d] = anchorDate.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);

  const boundary = (periodIndex: number) =>
    zonedInstant(y, m - 1, d + periodIndex * days, hh, mm, timeZone);

  const first = boundary(0);
  if (now.getTime() < first.getTime()) {
    return { start: first, end: new Date(boundary(1).getTime() - 1000), upcoming: true };
  }

  // Walk forward rather than dividing: period lengths vary by an hour across a
  // clock change, so arithmetic on a fixed length drifts.
  let index = Math.floor((now.getTime() - first.getTime()) / (days * 86_400_000));
  while (boundary(index + 1).getTime() <= now.getTime()) index += 1;
  while (boundary(index).getTime() > now.getTime()) index -= 1;

  return {
    start: boundary(index),
    end: new Date(boundary(index + 1).getTime() - 1000),
    upcoming: false,
  };
}

/** The period a partner is in right now, by its own schedule. */
/**
 * The period containing `now` on a schedule that breaks on fixed days of every
 * month (see `Schedule['monthly-days']`).
 *
 * Builds the break instants for the months either side of now, in the zone,
 * and takes the pair now falls between. Days are capped at 28 by the type, so
 * every month has every break and February needs no special case.
 */
export function monthlyDaysPeriod(
  days: number[],
  opens: string,
  time: string,
  timeZone: string,
  now: Date = new Date(),
) {
  const [hh, mm] = time.split(':').map(Number);
  const [oy, om, od] = opens.split('-').map(Number);
  const opening = zonedInstant(oy, om - 1, od, hh, mm, timeZone);

  const breaksAround = (at: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' })
      .formatToParts(at)
      .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    const y = Number(parts.year);
    const m = Number(parts.month) - 1;
    const out: Date[] = [];
    for (let offset = -1; offset <= 2; offset++) {
      for (const d of days) out.push(zonedInstant(y, m + offset, d, hh, mm, timeZone));
    }
    return out.sort((a, b) => a.getTime() - b.getTime());
  };

  if (now.getTime() < opening.getTime()) {
    const next = breaksAround(opening).find((b) => b.getTime() > opening.getTime())!;
    return { start: opening, end: new Date(next.getTime() - 1000), upcoming: true };
  }

  const breaks = breaksAround(now);
  // The last break at or before now. (A loop rather than findLastIndex, which
  // the project's TypeScript target does not include.)
  let i = 0;
  for (let k = 0; k < breaks.length; k++) if (breaks[k].getTime() <= now.getTime()) i = k;
  const start = breaks[i];
  const end = new Date(breaks[i + 1].getTime() - 1000);
  return { start, end, upcoming: false };
}

export function periodFor(schedule: Schedule, now: Date = new Date()) {
  if (schedule.kind === 'rolling') {
    return rollingPeriod(schedule.anchor, schedule.days, schedule.time, schedule.timeZone, now);
  }
  if (schedule.kind === 'monthly-days') {
    return monthlyDaysPeriod(schedule.days, schedule.opens, schedule.time, schedule.timeZone, now);
  }
  return { ...currentPeriod(now), upcoming: false };
}

/**
 * The period before the current one, or null if the board has not finished one.
 *
 * One second before the current period's start lands in the previous period —
 * unless that is before the board opened, when `periodFor` answers with the
 * opening period itself, which is the current one, not a previous one.
 */
export function previousPeriodFor(schedule: Schedule, now: Date = new Date()) {
  const current = periodFor(schedule, now);
  if (current.upcoming) return null;
  const previous = periodFor(schedule, new Date(current.start.getTime() - 1000));
  if (previous.upcoming || previous.start.getTime() >= current.start.getTime()) return null;
  return previous;
}

/** The zone a schedule's dates should be read in. Half-months are UTC. */
export function scheduleZone(schedule: Schedule): string {
  return schedule.kind === 'half-month' ? 'UTC' : schedule.timeZone;
}

/** e.g. "8:00 AM EDT" — the opening time, named in its own zone. */
export function timeLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  });
}

/** e.g. "1 – 15 OCTOBER 2026", or "14 OCT – 27 OCT 2026" across a month boundary. */
export function periodLabel(start: string, end: string, timeZone = 'UTC'): string {
  // Read in the schedule's own zone: a period that ends at 07:59 local is in
  // UTC terms the following day, and labelling it that way would put a date on
  // screen that nobody can wager in.
  const parts = (iso: string) => {
    const d = new Date(iso);
    const get = (opts: Intl.DateTimeFormatOptions) =>
      d.toLocaleString('en-US', { ...opts, timeZone });
    return {
      day: Number(get({ day: 'numeric' })),
      monthIndex: get({ month: 'numeric' }),
      monthShort: get({ month: 'short' }).toUpperCase(),
      monthLong: get({ month: 'long' }).toUpperCase(),
      year: get({ year: 'numeric' }),
    };
  };

  const from = parts(start);
  const to = parts(end);

  // A fortnight can straddle a month, and "28 – 10 NOVEMBER" would be a lie, so
  // both months are named when they differ.
  if (from.monthIndex !== to.monthIndex) {
    return `${from.day} ${from.monthShort} – ${to.day} ${to.monthShort} ${to.year}`;
  }

  return `${from.day} – ${to.day} ${to.monthLong} ${to.year}`;
}
