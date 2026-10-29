import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

/**
 * Signed cookies, for the Discord sign-in and the claim cooldown.
 *
 * There is no database on this site, so a cookie is the only place state can
 * live. Signing is what makes that safe enough to act on: the payload is
 * readable but cannot be edited, so nobody can hand themselves someone else's
 * Discord id or an expired cooldown.
 *
 * Everything is keyed on CLAIM_SECRET. Rotating it signs everyone out and
 * clears every cooldown, which is the intended blast radius.
 */

export const SESSION_COOKIE = 'mm_session';
export const OAUTH_STATE_COOKIE = 'mm_oauth_state';

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export type SessionUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

type Signed<T> = T & { exp: number };

function secret(): string {
  const value = process.env.CLAIM_SECRET?.trim();
  if (!value) throw new Error('CLAIM_SECRET is not set');
  return value;
}

export function signPayload<T extends object>(payload: T, ttlSeconds: number): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 }),
  ).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/** The payload this cookie carries, or null if absent, forged or expired. */
export function readPayload<T extends object>(raw: string | undefined): Signed<T> | null {
  if (!raw) return null;

  const [body, mac] = raw.split('.');
  if (!body || !mac) return null;

  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which a forged value will hit.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Signed<T>;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/**
 * Where Discord sends the player back.
 *
 * Discord matches this string exactly against the registered redirects, and
 * sends it twice — once to authorise, once to exchange the code — so both must
 * come from here. NEXT_PUBLIC_SITE_URL wins when set, because a proxied
 * deployment can see a host that is not the one the browser used.
 */
export function redirectUri(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');

  // Local development keeps its own origin even when the canonical one is set,
  // or signing in on localhost would bounce the developer to production.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
  const origin = isLocal ? requestOrigin : configured || requestOrigin;

  return `${origin}/api/auth/discord/callback`;
}

export function discordCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * The signed-in Discord account for this request, or null.
 *
 * One reader for every server component and route that needs to know who is
 * asking, so the cookie name and the signature check live in one place.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const user = readPayload<SessionUser>(jar.get(SESSION_COOKIE)?.value);
  return user ? { id: user.id, username: user.username, avatarUrl: user.avatarUrl } : null;
}

/**
 * Where to send someone after sign-in, if they asked for somewhere.
 *
 * Only a same-site path is honoured. A `next` of `//evil.example` or
 * `https://evil.example` is an open redirect — the Discord consent screen
 * would lend our name to a link that ends somewhere else — so anything that is
 * not a plain path starting with a single slash falls back to the default.
 */
export function safeNext(value: string | null | undefined, fallback = '/profile'): string {
  if (!value) return fallback;
  // `/\` is treated as `//` by some browsers, so it is refused alongside it.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Control characters (tabs, newlines) can be used to smuggle a second URL.
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
