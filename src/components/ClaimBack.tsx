import { cookies } from 'next/headers';

import { CLAIM_COOLDOWN_COOKIE } from '@/lib/claim';
import { SESSION_COOKIE, readPayload, type SessionUser } from '@/lib/session';
import { ClaimForm } from './ClaimForm';

/**
 * The affiliate-revenue claim section.
 *
 * Server half: reads the signed cookies so the first render already knows
 * whether the player is signed in and whether they are inside the cooldown.
 * Doing it here rather than in a client effect means no flash of the wrong
 * state, and the client never has to be trusted with either answer.
 */
export async function ClaimBack({ loginError }: { loginError?: string }) {
  const jar = await cookies();
  const user = readPayload<SessionUser>(jar.get(SESSION_COOKIE)?.value);
  const cooldown = readPayload<{ userId: string }>(jar.get(CLAIM_COOLDOWN_COOKIE)?.value);
  const cooldownExpiresAt = cooldown && user && cooldown.userId === user.id ? cooldown.exp : 0;

  return (
    <ClaimForm
      user={user ? { id: user.id, username: user.username, avatarUrl: user.avatarUrl } : null}
      cooldownExpiresAt={cooldownExpiresAt}
      loginError={loginError ?? null}
    />
  );
}
