import type { Metadata } from 'next';
import Link from 'next/link';

import { Countdown } from '@/components/Countdown';
import { formatMoney, periodLabel, scheduleZone } from '@/lib/format';
import { PARTNERS, PRIMARY_PARTNER } from '@/lib/partners';
import { getProfile } from '@/lib/profiles';
import { currentUser } from '@/lib/session';
import { pageMeta } from '@/lib/site';
import {
  WAGER_RAFFLE,
  WAGER_RAFFLE_POOL,
  currentRafflePeriod,
  drawFor,
  lastClosedRafflePeriod,
  raffleStandings,
  type RaffleStandings,
} from '@/lib/wager-raffle';

export const metadata: Metadata = pageMeta({
  title: 'Raffle',
  description: `A ${formatMoney(WAGER_RAFFLE_POOL)} raffle every leaderboard period on ${PRIMARY_PARTNER.name}: every ${formatMoney(WAGER_RAFFLE.ticketEvery)} of weighted wager under code ${PRIMARY_PARTNER.code} is a ticket.`,
  path: '/raffle',
});

/** Reads the session for "your tickets", so nothing here is cached. */
export const dynamic = 'force-dynamic';

const ordinal = (n: number) => ['1st', '2nd', '3rd'][n - 1] ?? `${n}th`;

export default async function RafflePage() {
  const period = currentRafflePeriod();
  const zone = scheduleZone(PARTNERS[WAGER_RAFFLE.partnerId].schedule);
  const lastClosed = lastClosedRafflePeriod();

  const user = await currentUser();
  const [standings, lastDraw, profile] = await Promise.all([
    raffleStandings(period).catch(() => null as RaffleStandings | null),
    lastClosed ? drawFor(lastClosed) : Promise.resolve(undefined),
    user ? getProfile(user.id) : Promise.resolve(undefined),
  ]);

  const roobet = profile?.roobetUsername || null;
  const mine = roobet
    ? (standings?.entrants.find((e) => e.username.toLowerCase() === roobet.toLowerCase()) ?? null)
    : null;
  const total = standings?.totalTickets ?? 0;
  const pct = (tickets: number) => (total ? `${((tickets / total) * 100).toFixed(1)}%` : '—');

  return (
    <>
      <section className="section wrap claim" style={{ paddingBottom: 0 }}>
        <span className="claim-kicker">Bi-weekly raffle</span>
        <h1 className="claim-title">
          <span className="amt">{formatMoney(WAGER_RAFFLE_POOL)}</span> raffle
        </h1>
        <p className="claim-lede">
          Every <b>{formatMoney(WAGER_RAFFLE.ticketEvery)}</b> of weighted wager on{' '}
          {PRIMARY_PARTNER.name} under code <b>{PRIMARY_PARTNER.code}</b> this period is one ticket.
          Two winners are drawn when the period closes — nothing to enter, just play.
        </p>

        <div className="rfl-prizes">
          {WAGER_RAFFLE.prizes.map((prize, i) => (
            <span className="rfl-prize" key={prize + i}>
              <span>{ordinal(i + 1)}</span>
              <b>{formatMoney(prize)}</b>
            </span>
          ))}
        </div>

        <div className="vipr-month">
          <span className="label">
            Draw in · {periodLabel(period.start.toISOString(), period.end.toISOString(), zone)}
          </span>
          <Countdown endsAt={period.end.toISOString()} />
        </div>

        {!user ? (
          <p className="vipr-status">
            <Link className="link" href="/api/auth/discord/login?next=/raffle">
              Sign in with Discord
            </Link>{' '}
            to see your tickets.
          </p>
        ) : !roobet ? (
          <p className="vipr-status">
            <Link className="link" href="/profile">
              Link your {PRIMARY_PARTNER.name} account
            </Link>{' '}
            to see your tickets. You are entered either way — tickets come from play, not sign-ups.
          </p>
        ) : (
          <p className="vipr-status">
            <b>{roobet}</b> ·{' '}
            {mine
              ? `${mine.tickets.toLocaleString('en-US')} ticket${mine.tickets === 1 ? '' : 's'} · ${pct(mine.tickets)} of the draw`
              : `no tickets yet — ${formatMoney(WAGER_RAFFLE.ticketEvery)} of weighted wager earns the first`}
          </p>
        )}
      </section>

      <section className="section wrap">
        {lastDraw && lastDraw.winners.length > 0 && (
          <div className="card rfl-last">
            <span className="label">
              Last draw · {periodLabel(lastDraw.periodStart, lastDraw.periodEnd, zone)}
            </span>
            <div className="rfl-last-winners">
              {lastDraw.winners.map((w) => (
                <div className="rfl-winner" key={w.place}>
                  <span className="rfl-place">{ordinal(w.place)}</span>
                  <b>{w.masked}</b>
                  <span className="rfl-meta">
                    {w.tickets} ticket{w.tickets === 1 ? '' : 's'}
                  </span>
                  <span className="rfl-won">{formatMoney(w.prize)}</span>
                </div>
              ))}
            </div>
            <p className="rfl-note">
              Drawn from {lastDraw.totalTickets.toLocaleString('en-US')} tickets across{' '}
              {lastDraw.entrants} players.
            </p>
          </div>
        )}

        <div className="lb-stats" style={{ marginTop: lastDraw ? 18 : 0 }}>
          <div className="lb-stats-head">
            <h2>This period</h2>
            <span className="label">Updated every minute</span>
          </div>
          <div className="lb-stats-grid">
            <div className="lb-stat">
              <span className="label">Players with tickets</span>
              <b>{standings ? standings.entrants.length : '—'}</b>
            </div>
            <div className="lb-stat">
              <span className="label">Tickets in the draw</span>
              <b>{standings ? total.toLocaleString('en-US') : '—'}</b>
            </div>
            <div className="lb-stat">
              <span className="label">One ticket per</span>
              <b>{formatMoney(WAGER_RAFFLE.ticketEvery)}</b>
            </div>
            <div className="lb-stat">
              <span className="label">Prize pool</span>
              <b className="accent">{formatMoney(WAGER_RAFFLE_POOL)}</b>
            </div>
          </div>
        </div>

        {!standings ? (
          <p className="notice" style={{ marginTop: 18 }}>
            <span className="notice-mark">i</span>
            Could not reach {PRIMARY_PARTNER.name} just now — tickets will show again shortly. The
            draw itself is not affected.
          </p>
        ) : standings.entrants.length === 0 ? (
          <p className="rfl-note" style={{ marginTop: 18, textAlign: 'center' }}>
            No tickets yet this period. The first {formatMoney(WAGER_RAFFLE.ticketEvery)} of weighted
            wager takes the whole draw.
          </p>
        ) : (
          <div className="standings" style={{ marginTop: 18 }}>
            <div className="standings-head rfl-head">
              <span className="label">#</span>
              <span className="label">Player</span>
              <span className="label">Tickets</span>
              <span className="label">Chance</span>
            </div>
            {standings.entrants.map((e, i) => (
              <div className="rank-row rfl-row" key={e.username}>
                <div className="rank-n">{i + 1}</div>
                <div className="player">
                  <span className="player-avatar" aria-hidden />
                  <div className="player-name">{e.masked}</div>
                </div>
                <div className="rank-wager">{e.tickets.toLocaleString('en-US')}</div>
                <div className="rank-prize">{pct(e.tickets)}</div>
              </div>
            ))}
          </div>
        )}

        <p className="claim-note" style={{ marginTop: 22 }}>
          Tickets are counted from {PRIMARY_PARTNER.name}&apos;s weighted wager — the same figure the
          leaderboard ranks on — for the leaderboard period, and reset when it closes. Winners are
          drawn automatically at the close, weighted by tickets, with one prize per player, and
          announced in the Discord. Staff accounts are excluded.
        </p>
      </section>
    </>
  );
}
