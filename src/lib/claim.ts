/**
 * Shared constants for the affiliate-revenue claim form.
 *
 * No node imports here: the client component reads these too, and the signing
 * half lives in claim-cookie.ts, which is server-only.
 */

export const CLAIM_COOLDOWN_COOKIE = 'mm_last_claim';
export const CLAIM_COOLDOWN_SECONDS = 24 * 60 * 60;

export const MAX_USERNAME_LENGTH = 40;
export const MAX_DISCORD_LENGTH = 40;
export const MAX_NOTE_LENGTH = 200;

export type ClaimCooldown = { at: string; exp: number };
