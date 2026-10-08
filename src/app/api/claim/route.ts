import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  CLAIM_COOLDOWN_COOKIE,
  CLAIM_COOLDOWN_SECONDS,
  MAX_NOTE_LENGTH,
  MAX_USERNAME_LENGTH,
} from '@/lib/claim';
import { PARTNERS } from '@/lib/partners';
import {
  SESSION_COOKIE,
  cookieOptions,
  readPayload,
  signPayload,
  type SessionUser,
} from '@/lib/session';

/**
 * Affiliate-revenue claims, posted to a Discord webhook.
 *
 * Sign-in with Discord is required, so every claim carries an account that can
 * be paid and can be refused. That is also the real anti-spam control: the
 * cooldown below rides in a cookie and a cleared cookie clears it, but a second
 * claim still needs a second Discord account.
 *
 * The webhook URL never leaves the server — anyone holding it can post into the
 * channel as the bot — and everything in the embed is typed by a stranger, so
 * mentions are disabled on the message rather than trusted to be absent.
 */

export const dynamic = 'force-dynamic';

const UA = 'MisfitMasonClaims/1.0 (+https://misfitmason.com)';

/**
 * Best-effort per-instance throttle. Serverless runs several instances, so this
 * is a speed bump on a flood from one address; sign-in is the real limit.
 */
const RECENT = new Map<string, number>();
const IP_WINDOW_MS = 60_000;
const IP_LIMIT = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, seen] of RECENT) {
    if (now - seen > IP_WINDOW_MS) RECENT.delete(key);
  }
  const hits = [...RECENT.keys()].filter((key) => key.startsWith(`${ip}|`)).length;
  if (hits >= IP_LIMIT) return true;
  RECENT.set(`${ip}|${now}`, now);
  return false;
}

/** Trims, caps length, and strips what would format or ping inside Discord. */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .slice(0, max)
    .replace(/[`*_~|\\]/g, '')
    .replace(/@(everyone|here)/gi, '@​$1')
    .replace(/<@[!&]?\d+>/g, '[mention removed]');
}

export async function POST(request: Request) {
  const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim();
  if (!webhook || !process.env.CLAIM_SECRET?.trim()) {
    console.error('[claim] DISCORD_CLAIM_WEBHOOK_URL or CLAIM_SECRET is not set');
    return NextResponse.json({ error: 'Claims are not configured yet.' }, { status: 503 });
  }

  const jar = await cookies();
  const user = readPayload<SessionUser>(jar.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: 'Sign in with Discord first.' }, { status: 401 });
  }

  // Keyed to the signed-in account, so signing out and back in does not reset
  // it — only clearing cookies does, which is the documented limit.
  const cooldown = readPayload<{ userId: string }>(jar.get(CLAIM_COOLDOWN_COOKIE)?.value);
  if (cooldown && cooldown.userId === user.id) {
    return NextResponse.json(
      { error: 'You have already claimed in the last 24 hours.', cooldownExpiresAt: cooldown.exp },
      { status: 429 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many claims, slow down.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const username = clean(body.username, MAX_USERNAME_LENGTH);
  const note = clean(body.note, MAX_NOTE_LENGTH);
  if (!username) {
    return NextResponse.json(
      { error: `Your ${PARTNERS.roobet.name} username is required.` },
      { status: 400 },
    );
  }

  const now = new Date();

  try {
    const delivered = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({
        username: 'Misfit Mason claims',
        // Nothing in this message may ping anybody: every field is user input.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: 'Affiliate revenue claim',
            color: 0xe31b45,
            ...(user.avatarUrl ? { thumbnail: { url: user.avatarUrl } } : {}),
            fields: [
              { name: 'Discord', value: `${user.username} (${user.id})`, inline: true },
              { name: PARTNERS.roobet.name, value: username, inline: true },
              ...(note ? [{ name: 'Note', value: note, inline: false }] : []),
            ],
            timestamp: now.toISOString(),
            footer: { text: 'misfitmason.com' },
          },
        ],
      }),
    });

    if (!delivered.ok) {
      console.error('[claim] webhook rejected:', delivered.status, await delivered.text());
      return NextResponse.json({ error: 'Could not send that claim. Try again.' }, { status: 502 });
    }
  } catch (error) {
    console.error('[claim] webhook failed:', error);
    return NextResponse.json({ error: 'Could not send that claim. Try again.' }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CLAIM_COOLDOWN_COOKIE,
    signPayload({ userId: user.id, at: now.toISOString() }, CLAIM_COOLDOWN_SECONDS),
    cookieOptions(CLAIM_COOLDOWN_SECONDS),
  );
  return response;
}
