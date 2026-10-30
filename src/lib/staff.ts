/**
 * Accounts kept out of the wager raffle and VIP rewards.
 *
 * Staff play under the same referral codes as everyone else, so they show up in
 * the affiliate feeds like any other player. They are ranked on the leaderboard
 * again (client decision, 2026-10-30), but still cannot win the raffle or claim
 * a milestone.
 *
 * Matching is case-insensitive and trimmed, because the operators do not agree
 * on casing between their APIs and their dashboards.
 */
/**
 * One person can appear under different names on different operators, so every
 * alias has to be listed: the same staff member is "Hooly" on Lootbox,
 * "Warhooly" on Shuffle and "Hooly123" on Roobet (confirmed by the client,
 * 2026-10-25). Being staff is not the same as
 * running the site, so none of these is an admin.
 */
const EXCLUDED = ['warhooly', 'hooly', 'hooly123'];

export function isExcludedPlayer(username: string | null | undefined): boolean {
  if (!username) return false;
  return EXCLUDED.includes(username.trim().toLowerCase());
}
