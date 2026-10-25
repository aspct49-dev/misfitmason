import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/session';
import {
  authorizeUrl,
  kickOAuthConfigured,
  KICK_STATE_COOKIE,
  KICK_VERIFIER_COOKIE,
  makePkce,
} from '@/lib/kick-oauth';

/**
 * Starts the Kick link.
 *
 * Signed in first, because the whole point is to attach a Kick account to
 * *this* Discord account — a flow begun by someone with no session has nothing
 * to attach to at the other end.
 *
 * The PKCE verifier and the state both go into short-lived httpOnly cookies.
 * State is what makes the callback refuse a code it did not ask for; the
 * verifier is what proves the code is being redeemed by whoever started.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/api/auth/discord/login?next=/profile', request.url));
  }
  if (!kickOAuthConfigured) {
    return NextResponse.redirect(
      new URL('/profile?error=Kick+linking+is+not+configured.', request.url),
    );
  }

  const state = randomBytes(16).toString('base64url');
  const { verifier, challenge } = makePkce();

  const res = NextResponse.redirect(authorizeUrl(state, challenge));
  // Ten minutes is longer than anyone takes to approve a consent screen and
  // short enough that an abandoned attempt does not linger.
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  };
  res.cookies.set(KICK_STATE_COOKIE, state, opts);
  res.cookies.set(KICK_VERIFIER_COOKIE, verifier, opts);
  return res;
}
