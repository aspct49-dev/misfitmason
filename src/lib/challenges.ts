import type { Challenge } from './types';

/**
 * Slot challenges. Edited here and nowhere else — there is no database and no
 * admin panel, so adding, retiring or marking one claimed is a commit.
 *
 * `bet` is the stake the attempt has to be made at, not a minimum: these are
 * posted as fixed-stake challenges so every attempt is comparable and a bigger
 * bankroll cannot buy a better chance at the same prize.
 *
 * A claimed challenge stays on the page with the winner shown rather than
 * disappearing. A board that only ever shows unclaimed targets looks like
 * nobody has ever won one.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: 'gates-1000',
    game: 'Gates of Olympus 1000',
    provider: 'Pragmatic Play',
    art: '/chal-gates1k.webp',
    requirement: 'Spin into any bonus and hit',
    multiplier: 1000,
    bet: 0.2,
    prize: 25,
    status: 'active',
  },
  {
    id: 'sweet-bonanza-1000',
    game: 'Sweet Bonanza 1000',
    provider: 'Pragmatic Play',
    art: '/chal-sweets1k.webp',
    requirement: 'Spin into any bonus and hit',
    multiplier: 900,
    bet: 0.2,
    prize: 30,
    status: 'active',
  },
  {
    id: 'sugar-rush-1000',
    game: 'Sugar Rush 1000',
    provider: 'Pragmatic Play',
    art: '/chal-sugarrush1k.webp',
    requirement: 'Spin into any bonus and hit',
    multiplier: 900,
    bet: 0.2,
    prize: 30,
    status: 'active',
  },
  {
    id: 'le-cowboy',
    game: 'Le Cowboy',
    provider: 'Hacksaw Gaming',
    art: '/chal-lecowboy.webp',
    // The only one where a bought bonus counts, which is the point of saying so.
    requirement: 'Spin or buy a bonus and hit',
    multiplier: 1100,
    bet: 0.2,
    prize: 25,
    status: 'active',
  },
];

/** Total on the table right now — claimed ones are already paid out. */
export const CHALLENGE_POOL = CHALLENGES.filter((c) => c.status === 'active').reduce(
  (sum, c) => sum + c.prize,
  0,
);
