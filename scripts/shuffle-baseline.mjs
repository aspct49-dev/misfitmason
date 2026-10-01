/**
 * Prints the SHUFFLE_BASELINE value for a new period.
 *
 * Shuffle's affiliate feed is cumulative and takes no date range, so a board
 * for "this month" is only possible by subtracting a snapshot taken when the
 * month opened. Run this as soon after 00:00 UTC on the 1st as you can — any
 * play between the reset and the snapshot is lost from the new board, and
 * counted into the old one.
 *
 *   node scripts/shuffle-baseline.mjs            # current month
 *   node scripts/shuffle-baseline.mjs 2026-11    # label it for a given month
 *
 * Paste the output into SHUFFLE_BASELINE (.env locally, Vercel env vars in
 * production) and redeploy. The provider ignores a baseline whose period does
 * not match, so a forgotten update shows cumulative totals and logs a warning
 * rather than quietly reporting wrong figures.
 */
import { readFileSync } from 'node:fs';

// Minimal .env read: this is a one-off operator script, not app code.
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const url = process.env.SHUFFLE_WAGER_URL?.trim();
if (!url) throw new Error('SHUFFLE_WAGER_URL is not set');

const period = process.argv[2] ?? new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(period)) throw new Error(`Period must be YYYY-MM, got "${period}"`);

const res = await fetch(url, { headers: { accept: 'application/json' } });
const body = await res.text();
if (!res.ok) throw new Error(`Shuffle responded ${res.status}: ${body}`);

const rows = JSON.parse(body);
if (!Array.isArray(rows)) throw new Error('Shuffle returned an unexpected payload');

const players = {};
for (const row of rows) {
  players[String(row.username).trim().toLowerCase()] = {
    wagered: row.wagerAmount,
    weighted: row.weightedWagerAmount,
  };
}

console.error(`${rows.length} players snapshotted for ${period}. Set SHUFFLE_BASELINE to:\n`);
console.log(JSON.stringify({ period, players }));
