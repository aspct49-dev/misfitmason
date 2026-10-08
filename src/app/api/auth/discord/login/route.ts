import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  cookieOptions,
  discordCredentials,
  redirectUri,
  signPayload,
} from '@/lib/session';

/**
 * Starts the Discord sign-in.
 *
 * `identify` only: the claim needs a stable account to attribute to and a name
 * to put in the channel, and nothing else. Asking for email or guild scopes
 * would make the consent screen look like it wants more than it does.
 *
 * The state is random, signed and short-lived. Without it, anyone could feed a
 * player a callback URL and sign them into an account they do not own.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const credentials = discordCredentials();
  if (!credentials) {
    console.error('[auth] DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not set');
    return NextResponse.redirect(new URL('/claim?login=not_configured', request.url));
  }

  const state = randomBytes(16).toString('base64url');
  const authorize = new URL('https://discord.com/oauth2/authorize');
  authorize.searchParams.set('client_id', credentials.clientId);
  authorize.searchParams.set('redirect_uri', redirectUri(request));
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'identify');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('prompt', 'none');

  const response = NextResponse.redirect(authorize);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    signPayload({ state }, OAUTH_STATE_TTL_SECONDS),
    cookieOptions(OAUTH_STATE_TTL_SECONDS),
  );
  return response;
}
