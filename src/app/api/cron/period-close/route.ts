import { NextResponse } from 'next/server';

import { formatMoney, periodFor, periodLabel, scheduleZone } from '@/lib/format';
import { PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import { getLeaderboard } from '@/lib/services/leaderboard';
import type { Leaderboard, Partner } from '@/lib/types';
import { WAGER_RAFFLE, drawRaffle, raffleStandings, type RaffleDraw } from '@/lib/wager-raffle';

/**
 * Posts the final standings to Discord when a period closes.
 *
 * Run by Vercel Cron (see vercel.json). There is no database, so there is
 * nothing to record "already announced" in — the guard is the window instead:
 * a post only happens inside ANNOUNCE_WINDOW_MS of a close, and the schedules
 * are set so exactly one cron run falls in that window per close. Two daily
 * runs cover both sides of the US clock change, since the board closes at 8am
 * Eastern, which is 12:00 UTC in summer and 13:00 UTC in winter.
 *
 * The delay before the window opens is deliberate: Roobet's figures update
 * hourly, and announcing a winner off a stale read is worse than announcing
 * half an hour late.
 */

export const dynamic = 'force-dynamic';

/** How long after a close a run may still announce it. */
const ANNOUNCE_WINDOW_MS = 60 * 60 * 1000;
const UA = 'MisfitMasonClaims/1.0 (+https://www.misfitmason.com)';

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Without a secret the route is refused rather than left open: an unguarded
  // endpoint that posts to Discord is a spam button with a public URL.
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * The period that just finished, or null if none has.
 *
 * Stepping a second before the current period's start lands in the previous
 * one — except before the first boundary, where there is no previous one and
 * `periodFor` answers with the first period itself. Without that check the
 * route announces the period that is still running as its own final standings,
 * which is exactly as wrong as it sounds.
 */
function closedPeriod(partner: Partner, now: Date) {
  const current = periodFor(partner.schedule, now);
  if (current.upcoming) return null;

  const previous = periodFor(partner.schedule, new Date(current.start.getTime() - 1000));
  if (previous.upcoming || previous.start.getTime() >= current.start.getTime()) return null;

  return previous;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  // `force` re-announces outside the window, for a run that was missed or for
  // a dry run before a real close. It cannot be reached without the secret.
  const params = new URL(request.url).searchParams;
  const force = params.get('force') === '1';
  const dry = params.get('dry') === '1';

  // A dry run posts nothing, so it does not need a webhook — which lets it be
  // run with the real one blanked out.
  const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim() ?? '';
  if (!webhook && !dry) {
    console.error('[cron] DISCORD_CLAIM_WEBHOOK_URL is not set');
    return NextResponse.json({ error: 'No webhook configured' }, { status: 503 });
  }
  /* `at` pretends it is another time, so a close can be previewed before it
     happens. Honoured only on a dry run: pretending on a live run would
     announce the wrong period, confidently. */
  const pretend = dry ? params.get('at') : null;
  const now = pretend ? new Date(pretend) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: 'Invalid `at`' }, { status: 400 });
  }
  const results: Array<Record<string, unknown>> = [];

  for (const id of PARTNER_ORDER) {
    const partner = PARTNERS[id];
    if (partner.comingSoon) continue;

    const closed = closedPeriod(partner, now);
    if (!closed) {
      results.push({ partner: id, posted: false, reason: 'no completed period yet' });
      continue;
    }

    const since = now.getTime() - closed.end.getTime();

    if (!force && (since < 0 || since > ANNOUNCE_WINDOW_MS)) {
      results.push({ partner: id, posted: false, reason: 'outside announce window' });
      continue;
    }

    const board = await getLeaderboard(id, { start: closed.start, end: closed.end });
    if (board.source !== 'live' || board.error) {
      console.error(`[cron] ${id}: not announcing, board came back ${board.source} ${board.error ?? ''}`);
      results.push({ partner: id, posted: false, reason: 'board unavailable' });
      continue;
    }

    // `dry` builds the message and returns it without posting, so the format
    // can be checked without putting a test announcement in front of players.
    if (dry) {
      results.push({ partner: id, posted: false, reason: 'dry run', preview: buildMessage(partner, board) });
      // A dry run never draws — a draw is permanent. It shows what would be
      // drawn from instead.
      if (id === WAGER_RAFFLE.partnerId) {
        const pool = await raffleStandings({ start: closed.start, end: closed.end }).catch(() => null);
        results.push({
          raffle: true,
          drawn: false,
          reason: 'dry run',
          entrants: pool?.entrants.length ?? null,
          tickets: pool?.totalTickets ?? null,
        });
      }
      continue;
    }

    const delivered = await post(webhook, partner, board);
    results.push({ partner: id, posted: delivered, players: board.stats.players });

    /* The raffle draws at the same close. drawRaffle is idempotent — a period
       already drawn returns its saved result — so it is only announced when
       this run made the draw, never a second time. */
    if (id === WAGER_RAFFLE.partnerId) {
      try {
        const drawn = await drawRaffle({ start: closed.start, end: closed.end });
        if (drawn.ok) {
          const sent = drawn.fresh ? await postRaffle(webhook, drawn.draw) : false;
          results.push({
            raffle: true,
            drawn: true,
            fresh: drawn.fresh,
            posted: sent,
            winners: drawn.draw.winners.map((w) => w.masked),
          });
        } else {
          results.push({ raffle: true, drawn: false, reason: drawn.error });
        }
      } catch (error) {
        console.error('[cron] raffle draw failed:', error);
        results.push({ raffle: true, drawn: false, reason: 'draw failed — use /admin/wager-raffle' });
      }
    }
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), results });
}

function buildMessage(partner: Partner, board: Leaderboard) {
  const zone = scheduleZone(partner.schedule);
  const paid = board.entries.filter((e) => e.prize > 0);
  const winners = paid.filter((e) => !e.unclaimed);

  const medal = ['🥇', '🥈', '🥉'];
  const lines = paid.map((entry) => {
    const place = medal[entry.rank - 1] ?? `**${entry.rank}.**`;
    if (entry.unclaimed) return `${place} *Open place* — ${formatMoney(entry.prize)} unclaimed`;
    /* Masked names start with asterisks, which Discord reads as bold/italic
       markers: "**wMww" bolds the rest of the line and eats the name. Inline
       code is the one wrapper that renders them literally. */
    const name = `\`${entry.username.replace(/`/g, "'")}\``;
    return `${place} ${name} — ${formatMoney(entry.wagered)} ${partner.weighted ? 'weighted' : 'wagered'} · **${formatMoney(entry.prize)}**`;
  });

  const body = {
    username: 'Misfit Mason leaderboards',
    // Masked usernames cannot ping anyone, but the rule holds for every
    // message this site sends: nothing it posts may mention.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${partner.name} leaderboard — final standings`,
        description: [
          `**${periodLabel(board.periodStart, board.periodEnd, zone)}** · closed`,
          '',
          ...lines,
        ].join('\n'),
        color: 0xe31b45,
        fields: [
          { name: 'Players', value: String(board.stats.players), inline: true },
          {
            name: partner.weighted ? 'Total weighted' : 'Total wagered',
            value: formatMoney(board.stats.totalWagered),
            inline: true,
          },
          { name: 'Paid out', value: formatMoney(winners.reduce((s, e) => s + e.prize, 0)), inline: true },
        ],
        footer: { text: 'misfitmason.com · usernames masked, as on the site' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return body;
}

async function post(webhook: string, partner: Partner, board: Leaderboard): Promise<boolean> {
  const body = buildMessage(partner, board);

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[cron] webhook rejected:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[cron] webhook failed:', error);
    return false;
  }
}

/** The raffle result, posted after the leaderboard's. */
async function postRaffle(webhook: string, draw: RaffleDraw): Promise<boolean> {
  const medal = ['🥇', '🥈', '🥉'];
  const zone = scheduleZone(PARTNERS[WAGER_RAFFLE.partnerId].schedule);
  const lines = draw.winners.map(
    (w) =>
      // Inline code: masked names start with asterisks, which Discord would
      // otherwise read as bold markers.
      `${medal[w.place - 1] ?? `**${w.place}.**`} \`${w.masked.replace(/`/g, "'")}\` — ${w.tickets} ticket${w.tickets === 1 ? '' : 's'} · **${formatMoney(w.prize)}**`,
  );

  const body = {
    username: 'Misfit Mason leaderboards',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${formatMoney(draw.winners.reduce((s, w) => s + w.prize, 0))} raffle — winners`,
        description: [
          `**${periodLabel(draw.periodStart, draw.periodEnd, zone)}** · drawn`,
          '',
          ...(lines.length ? lines : ['No tickets were earned this period, so nothing was drawn.']),
        ].join('\n'),
        color: 0xe31b45,
        fields: [
          { name: 'Tickets in the draw', value: draw.totalTickets.toLocaleString('en-US'), inline: true },
          { name: 'Players', value: String(draw.entrants), inline: true },
          { name: 'One ticket per', value: `${formatMoney(WAGER_RAFFLE.ticketEvery)} weighted`, inline: true },
        ],
        footer: { text: 'misfitmason.com/raffle · usernames masked, as on the site' },
        timestamp: draw.drawnAt,
      },
    ],
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error('[cron] raffle webhook rejected:', res.status, await res.text());
    return res.ok;
  } catch (error) {
    console.error('[cron] raffle webhook failed:', error);
    return false;
  }
}
