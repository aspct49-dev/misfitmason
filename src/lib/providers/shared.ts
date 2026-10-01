import { maskUsername } from '../format';
import type { LeaderboardEntry } from '../types';

/**
 * What a provider knows about a player before ranks and prizes are applied.
 *
 * `username` is the operator's raw name. Masking happens in `buildEntries`
 * rather than in each provider, so a new integration cannot forget it.
 */
export interface RawPlayer {
  username: string;
  wagered: number;
  favouriteGame?: string;
  /** Partner's own avatar or player-tier badge, if it publishes one. */
  tierBadgeUrl?: string;
}

/**
 * Ranks every player the partner returned, and pads to at least as many seats
 * as the prize table pays.
 *
 * Two rules, both of which the small affiliate base makes the normal case
 * rather than an edge case:
 *
 *   - Every paying position renders even with nobody in it, `unclaimed` with
 *     the prize still attached. A board with two players then reads as places
 *     going spare, which is both the honest picture and the more persuasive one.
 *   - Everyone below the paying places is listed too, with `prize: 0`. Someone
 *     in 7th can see exactly what the gap to 3rd is, which is the whole reason
 *     to keep wagering; a board cut off at the prizes hides that from the
 *     people most likely to act on it.
 */
export function buildEntries(players: RawPlayer[], prizeTable: number[]): LeaderboardEntry[] {
  const seats = Math.max(players.length, prizeTable.length);

  return Array.from({ length: seats }, (_, i) => {
    const prize = prizeTable[i] ?? 0;
    const player = players[i];
    if (!player) {
      return { rank: i + 1, username: '', wagered: 0, prize, unclaimed: true };
    }
    return {
      rank: i + 1,
      username: maskUsername(player.username),
      wagered: player.wagered,
      prize,
      favouriteGame: player.favouriteGame,
      tierBadgeUrl: player.tierBadgeUrl,
      unclaimed: false,
    };
  });
}
