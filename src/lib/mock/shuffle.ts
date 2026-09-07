import type { RawPlayer } from '../providers/shared';

/**
 * Fallback only. Served when the Shuffle API is unreachable or rate limited, so
 * the page renders something coherent instead of an error, and always flagged
 * `source: 'mock'` in the UI so nobody mistakes it for live standings.
 */
export const SHUFFLE_FALLBACK: RawPlayer[] = [
  { username: '****ooly', wagered: 2309.93 },
];
