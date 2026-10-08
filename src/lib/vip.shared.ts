/**
 * The VIP transfer constants both sides need.
 *
 * Split from `vip.ts` because that file is `server-only` — it holds the webhook
 * and the byte-level file checks, neither of which belongs in a browser bundle.
 * The form still has to offer the same options and enforce the same file count,
 * and a second copy of those would be a second thing to keep in step.
 */

export const LOSSBACK_OPTIONS = ['5%', '10%', '15%', '20%', 'None yet'] as const;
export type Lossback = (typeof LOSSBACK_OPTIONS)[number];

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Everything in one submission, together. Kept under Discord's own ceiling
 * rather than at it: an upload over their limit comes back as a 413 with
 * nothing useful in it.
 */
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const MAX_NAME_LENGTH = 40;
export const MAX_GAMES_LENGTH = 120;
export const MAX_NOTES_LENGTH = 500;
