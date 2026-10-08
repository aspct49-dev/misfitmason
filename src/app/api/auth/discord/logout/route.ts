import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session';

/**
 * Signs the player out of this site only — the Discord authorisation itself
 * stays granted, which is what a player expects from a "sign out" on a page
 * they signed into with Discord.
 *
 * POST rather than GET so a link or an image somewhere else cannot sign
 * somebody out by being loaded.
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
