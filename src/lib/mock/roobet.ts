import type { RawPlayer } from '../providers/shared';

/**
 * Fallback only. Served when the Roobet API is unreachable so the page renders
 * something coherent instead of an error, and always flagged `source: 'mock'`
 * in the UI so nobody mistakes it for live standings.
 */
export const ROOBET_FALLBACK: RawPlayer[] = [
  { username: '*********Lost', wagered: 433.92, favouriteGame: 'Keno' },
];
