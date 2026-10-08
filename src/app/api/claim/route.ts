import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  CLAIM_COOLDOWN_COOKIE,
  CLAIM_COOLDOWN_SECONDS,
  MAX_DISCORD_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_USERNAME_LENGTH,
} from '@/lib/claim';
import { readCooldown, signCooldown } from '@/lib/claim-cookie';
import { PARTNERS } from '@/lib/partners';

/**
 * Affiliate-revenue claims, posted to a Discord webhook.
 *
 * The webhook URL never leaves the server: anyone holding it can post into the
 * channel as the bot, so it is read from the environment here and is not a
 * NEXT_PUBLIC_ variable. The form posts to this route instead.
 *
 * Everything in the embed is typed by a stranger, so mentions are disabled on
 * the message rather than trusted to be absent — otherwise "@everyone" in a
 * username field pings the whole server.
 */

export const dynamic = 'force-dynamic';

/**
 * Best-effort per-instance throttle. A serverless deployment runs several
 * instances, so this is a speed bump on a flood from one address rather than a
 * guarantee; the signed cookie is what throttles an ordinary repeat.
 */
const RECENT = new Map<string, number>();
const IP_WINDOW_MS = 60_000;
const IP_LIMIT = 3;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, seen] of RECENT) {
    if (now - seen > IP_WINDOW_MS) RECENT.delete(key);
  }
  const hits = [...RECENT.entries()].filter(([key]) => key.startsWith(`${ip}|`)).length;
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
  const cooldown = readCooldown(jar.get(CLAIM_COOLDOWN_COOKIE)?.value);
  if (cooldown) {
    return NextResponse.json(
      { error: 'You have already claimed today.', cooldownExpiresAt: cooldown.exp },
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
  const discord = clean(body.discord, MAX_DISCORD_LENGTH);
  const note = clean(body.note, MAX_NOTE_LENGTH);

  if (!username) {
    return NextResponse.json({ error: `Your ${PARTNERS.roobet.name} username is required.` }, { status: 400 });
  }
  if (!discord) {
    return NextResponse.json({ error: 'A Discord handle is required so you can be paid.' }, { status: 400 });
  }

  const now = new Date();

  try {
    const delivered = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'Misfit Mason claims',
        // Nothing in this message may ping anybody: every field is user input.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: 'Affiliate revenue claim',
            color: 0xe31b45,
            fields: [
              { name: PARTNERS.roobet.name, value: username, inline: true },
              { name: 'Discord', value: discord, inline: true },
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
  response.cookies.set(CLAIM_COOLDOWN_COOKIE, signCooldown(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CLAIM_COOLDOWN_SECONDS,
  });
  return response;
}
