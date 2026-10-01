/** Formatting and masking. Shared by providers and components. */

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

/** e.g. "1 – 15 OCTOBER 2026". Both halves of the range, since there are two a month. */
export function periodLabel(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);
  const month = to
    .toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
  return `${from.getUTCDate()} – ${to.getUTCDate()} ${month}`;
}
