import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { CLAIM_COOLDOWN_SECONDS, type ClaimCooldown } from './claim';

/**
 * The claim cooldown, carried in a signed cookie.
 *
 * Signed rather than stored: there is no database on this site, and the claim
 * record is the Discord channel the webhook posts into. That has a real limit —
 * clearing cookies clears the cooldown — so this throttles honest repeat
 * submissions rather than preventing determined ones. Making it authoritative
 * means a datastore keyed on the player, not a cookie.
 *
 * The signature is still worth having: without it anyone could hand themselves
 * an expiry in the past, and the cooldown would stop meaning anything at all.
 */

function secret(): string {
  const value = process.env.CLAIM_SECRET?.trim();
  if (!value) throw new Error('CLAIM_SECRET is not set');
  return value;
}

export function signCooldown(now: Date): string {
  const payload: ClaimCooldown = {
    at: now.toISOString(),
    exp: now.getTime() + CLAIM_COOLDOWN_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/** The cooldown this cookie carries, or null if absent, forged or expired. */
export function readCooldown(raw: string | undefined): ClaimCooldown | null {
  if (!raw) return null;

  const [body, mac] = raw.split('.');
  if (!body || !mac) return null;

  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which a forged value will hit.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ClaimCooldown;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
