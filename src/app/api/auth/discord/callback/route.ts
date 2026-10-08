import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieOptions,
  discordCredentials,
  readPayload,
  redirectUri,
  signPayload,
  type SessionUser,
} from '@/lib/session';

/**
 * Finishes the Discord sign-in and issues the session cookie.
 *
 * Failures go back to the claim section with a `login` code rather than
 * rendering an error page: the player is mid-task, and the form is where the
 * retry lives. Nothing here is ever shown raw to the browser — the codes map to
 * copy in the UI.
 */
export const dynamic = 'force-dynamic';

const UA = 'MisfitMasonClaims/1.0 (+https://misfitmason.com)';

function back(request: Request, error?: string) {
  const url = new URL(error ? `/rewards?login=${error}#claim` : '/rewards#claim', request.url);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const credentials = discordCredentials();
  if (!credentials) return back(request, 'not_configured');

  const params = new URL(request.url).searchParams;
  if (params.get('error')) return back(request, 'denied');

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return back(request, 'no_code');

  const jar = await cookies();
  const expected = readPayload<{ state: string }>(jar.get(OAUTH_STATE_COOKIE)?.value);
  if (!expected || expected.state !== state) return back(request, 'bad_state');

  let user: SessionUser;
  try {
    const token = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(request),
      }),
    });

    if (!token.ok) {
      console.error('[auth] token exchange failed:', token.status, await token.text());
      return back(request, 'token_exchange');
    }

    const { access_token: accessToken } = (await token.json()) as { access_token?: string };
    if (!accessToken) return back(request, 'token_exchange');

    const profile = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { authorization: `Bearer ${accessToken}`, 'user-agent': UA },
    });
    if (!profile.ok) {
      console.error('[auth] profile fetch failed:', profile.status, await profile.text());
      return back(request, 'profile');
    }

    const me = (await profile.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
    };

    user = {
      id: me.id,
      username: me.global_name || me.username,
      avatarUrl: me.avatar
        ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`
        : null,
    };
  } catch (error) {
    console.error('[auth] sign-in failed:', error);
    return back(request, 'auth_failed');
  }

  const response = back(request);
  response.cookies.set(
    SESSION_COOKIE,
    signPayload(user, SESSION_TTL_SECONDS),
    cookieOptions(SESSION_TTL_SECONDS),
  );
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
