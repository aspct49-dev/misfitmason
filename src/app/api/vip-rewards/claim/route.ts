import { NextResponse } from 'next/server';

import { getProfile } from '@/lib/profiles';
import { currentUser } from '@/lib/session';
import { announceClaim, fileClaim } from '@/lib/vip-rewards';

/**
 * Claims one VIP reward level for the signed-in account.
 *
 * The level is the only thing the browser decides. Who is claiming comes from
 * the signed session, which Roobet account from their linked profile, and
 * whether the level is earned from Roobet's own figure — so a forged request
 * can at most ask for a level, never assert that it was reached.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in with Discord first.' }, { status: 401 });

  const profile = await getProfile(user.id);
  if (!profile?.roobetUsername) {
    return NextResponse.json(
      { error: 'Link your Roobet account on your profile first.' },
      { status: 400 },
    );
  }

  let level: number;
  try {
    const body = (await request.json()) as { level?: unknown };
    level = Number(body.level);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!Number.isInteger(level)) {
    return NextResponse.json({ error: 'Invalid level.' }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof fileClaim>>;
  try {
    result = await fileClaim(user, profile.roobetUsername, level);
  } catch (error) {
    // The store refusing a write is ours to fix, not the player's — most often
    // a deployment with no Redis attached, where every write throws.
    console.error('[vip-rewards] could not file claim:', error);
    return NextResponse.json(
      { error: 'Claims are not being accepted right now. Try again later, or ask in the Discord.' },
      { status: 503 },
    );
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  // Filed first, announced second: if Discord is down the claim still exists
  // and shows in the admin panel, rather than being lost with the message.
  await announceClaim(result.claim, user.avatarUrl);
  return NextResponse.json({ ok: true, claim: result.claim });
}
