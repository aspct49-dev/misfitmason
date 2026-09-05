import type { BiggestHit } from '../types';
import type { RawPlayer } from '../providers/shared';

/**
 * Lootbox fixtures.
 *
 * Deliberately modest. The real Roobet affiliate base is two players, so a mock
 * Lootbox board showing a packed top five with five-figure wagers would make
 * the live board next to it look broken and would misrepresent the community's
 * size. Three players, realistic amounts, two seats open.
 */
export const LOOTBOX_FIXTURE: { players: RawPlayer[]; biggestHit: BiggestHit } = {
  players: [
    { username: '*****4c9f', wagered: 1842.5, favouriteGame: 'Case Battles' },
    { username: '***7t2x', wagered: 964.18, favouriteGame: 'Upgrader' },
    { username: '******k11q', wagered: 317.4, favouriteGame: 'Case Battles' },
  ],
  biggestHit: {
    username: '*****4c9f',
    multiplier: 112.4,
    gameTitle: 'Case Battles',
    wagered: 5,
    payout: 562,
  },
};
