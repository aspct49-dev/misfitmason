import { NextResponse } from 'next/server';

import { PARTNERS } from '@/lib/partners';
import { getLeaderboard } from '@/lib/services/leaderboard';
import type { PartnerId } from '@/lib/types';

/**
 * JSON proxy for the standings.
 *
 * The pages render server-side and do not need this, but it keeps the token on
 * the server for anything that does — an OBS overlay, a Discord bot, a future
 * client-side refresh. The bearer token is never exposed; only normalised
 * domain objects with already-masked usernames leave the server.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partner: string }> },
) {
  const { partner } = await params;

  if (!(partner in PARTNERS)) {
    return NextResponse.json({ error: 'Unknown partner' }, { status: 404 });
  }

  const board = await getLeaderboard(partner as PartnerId);

  return NextResponse.json(board, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
