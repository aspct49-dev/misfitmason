import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { PARTNERS } from '@/lib/partners';
import { SESSION_COOKIE, cookieOptions, readPayload, signPayload, type SessionUser } from '@/lib/session';
import {
  LOSSBACK_OPTIONS,
  MAX_FILES,
  checkImage,
  checkTotalSize,
  clean,
  deliver,
  rateLimited,
  type Lossback,
} from '@/lib/vip';
import { MAX_GAMES_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH } from '@/lib/vip.shared';

/**
 * Takes a VIP transfer application and hands it to Discord.
 *
 * Everything is re-checked here. The form validates too, so nobody waits for a
 * round trip to learn they forgot a screenshot, but a form is a convenience and
 * this is the rule: the sizes, the types, the actual bytes of each file, and
 * how many there are.
 */

export const dynamic = 'force-dynamic';

const VIP_COOLDOWN_COOKIE = 'mm_last_vip';
const VIP_COOLDOWN_SECONDS = 24 * 60 * 60;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim() || !process.env.CLAIM_SECRET?.trim()) {
    console.error('[vip] DISCORD_CLAIM_WEBHOOK_URL or CLAIM_SECRET is not set');
    return bad('VIP transfers are not configured yet.', 503);
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return bad('That is a lot of applications. Try again in fifteen minutes.', 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad('That form did not arrive in one piece. Try again.');
  }

  /*
   * The honeypot: a field that is hidden, unlabelled and skipped by tab, so a
   * person never reaches it and a script filling every input does.
   *
   * Answered with the ordinary success shape on purpose — a bot told it failed
   * tries something else, one told it worked goes away.
   */
  if (String(form.get('company') ?? '').trim()) {
    console.warn('[vip] honeypot filled, dropping submission');
    return NextResponse.json({ ok: true });
  }

  const jar = await cookies();
  const session = readPayload<SessionUser>(jar.get(SESSION_COOKIE)?.value);

  const username = clean(String(form.get('username') ?? ''), MAX_NAME_LENGTH);
  if (username.length < 2) {
    return bad(`Enter the ${PARTNERS.roobet.name} username you play under.`);
  }

  // The signed-in identity wins over anything typed: it is the handle they will
  // actually be replied to on, and one they cannot mistype.
  const discord = session
    ? clean(session.username, MAX_NAME_LENGTH)
    : clean(String(form.get('discord') ?? ''), MAX_NAME_LENGTH);
  if (!discord) return bad('Sign in, or give a Discord handle so we can reply.');

  const currentCasino = clean(String(form.get('currentCasino') ?? ''), MAX_NAME_LENGTH);
  if (!currentCasino) return bad('Tell us which casino you are a VIP at now.');

  const lossback = String(form.get('lossback') ?? '');
  if (!LOSSBACK_OPTIONS.includes(lossback as Lossback)) {
    return bad('Pick your current lossback level.');
  }

  const games = clean(String(form.get('games') ?? ''), MAX_GAMES_LENGTH);
  if (!games) return bad('Tell us what you mostly play.');

  const recent = form.getAll('recent').filter((f): f is File => f instanceof File && f.size > 0);
  const lifetime = form.getAll('lifetime').filter((f): f is File => f instanceof File && f.size > 0);

  if (recent.length === 0) return bad('Add at least one screenshot of your last 30 days.');
  if (lifetime.length === 0) return bad('Add at least one screenshot of your lifetime wagered.');
  if (recent.length > MAX_FILES || lifetime.length > MAX_FILES) {
    return bad(`Up to ${MAX_FILES} images per section.`);
  }

  const oversize = checkTotalSize([...recent, ...lifetime]);
  if (oversize) return bad(oversize);

  for (const file of [...recent, ...lifetime]) {
    const problem = await checkImage(file);
    if (problem) return bad(problem);
  }

  /* Checked after validation, so a rejected submission does not spend someone's
     allowance — they have not applied, they have made a mistake, and the two
     should not cost the same. */
  const cooldown = readPayload<{ key: string }>(jar.get(VIP_COOLDOWN_COOKIE)?.value);
  if (cooldown) {
    return NextResponse.json(
      {
        error:
          'You have already applied today. If something was wrong with it, say so in the Discord rather than sending another.',
        cooldownExpiresAt: cooldown.exp,
      },
      { status: 429 },
    );
  }

  const result = await deliver({
    username,
    discord,
    currentCasino,
    lossback,
    games,
    notes: clean(String(form.get('notes') ?? ''), MAX_NOTES_LENGTH),
    recent,
    lifetime,
  });

  if (!result.ok) {
    // The applicant cannot do anything about this, so it does not read as
    // though they got something wrong.
    return bad('We could not deliver that just now. Try again in a minute.', 502);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    VIP_COOLDOWN_COOKIE,
    signPayload({ key: session?.id ?? 'anon', at: new Date().toISOString() }, VIP_COOLDOWN_SECONDS),
    cookieOptions(VIP_COOLDOWN_SECONDS),
  );
  return response;
}
