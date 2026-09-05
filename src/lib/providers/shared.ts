import type { LeaderboardEntry } from '../types';

/** What a provider knows about a player before ranks and prizes are applied. */
export interface RawPlayer {
  username: string;
  wagered: number;
  favouriteGame?: string;
  tierBadgeUrl?: string;
}

/**
 * Turns however many players a partner returned into exactly as many seats as
 * the prize table pays.
 *
 * The affiliate base is small, so an empty seat is the normal case rather than
 * an edge case: every paying position renders, and the ones nobody has taken
 * come back `unclaimed` with the prize still attached. A leaderboard with two
 * players then reads as three prizes going spare, which is both the honest
 * picture and the more persuasive one.
 */
export function buildEntries(players: RawPlayer[], prizeTable: number[]): LeaderboardEntry[] {
  return prizeTable.map((prize, i) => {
    const player = players[i];
    if (!player) {
      return { rank: i + 1, username: '', wagered: 0, prize, unclaimed: true };
    }
    return {
      rank: i + 1,
      username: player.username,
      wagered: player.wagered,
      prize,
      favouriteGame: player.favouriteGame,
      tierBadgeUrl: player.tierBadgeUrl,
      unclaimed: false,
    };
  });
}
