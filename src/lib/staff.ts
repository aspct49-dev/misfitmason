/**
 * Accounts that never appear on a leaderboard.
 *
 * Staff play under the same referral codes as everyone else, so they show up in
 * the affiliate feeds like any other player. Excluding them here keeps them out
 * of the standings, the prize places and the whole-board stats alike.
 *
 * Matching is case-insensitive and trimmed, because the operators do not agree
 * on casing between their APIs and their dashboards.
 */
/**
 * One person can appear under different names on different operators, so every
 * alias has to be listed: the same staff member is "Hooly" on Lootbox,
 * "Warhooly" on Shuffle and "Hooly123" on Roobet (confirmed by the client,
 * 2026-10-25). Excluded from the boards only — being staff is not the same as
 * running the site, so none of these is an admin.
 */
const EXCLUDED = ['warhooly', 'hooly', 'hooly123'];

export function isExcludedPlayer(username: string | null | undefined): boolean {
  if (!username) return false;
  return EXCLUDED.includes(username.trim().toLowerCase());
}

/** Drops excluded accounts from a set of rows before ranking or totalling. */
export function withoutExcluded<T>(rows: T[], getUsername: (row: T) => string): T[] {
  return rows.filter((row) => !isExcludedPlayer(getUsername(row)));
}
