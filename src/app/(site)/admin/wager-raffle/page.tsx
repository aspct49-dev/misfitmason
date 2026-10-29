import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { assertAdmin } from '@/lib/admin';
import { formatMoney, periodLabel, scheduleZone } from '@/lib/format';
import { PARTNERS } from '@/lib/partners';
import { PRIVATE_PAGE } from '@/lib/site';
import {
  WAGER_RAFFLE,
  currentRafflePeriod,
  drawFor,
  drawRaffle,
  lastClosedRafflePeriod,
  listDraws,
  raffleStandings,
} from '@/lib/wager-raffle';

/**
 * The bi-weekly raffle, from the admin side.
 *
 * Draws happen on their own at each close, inside the period-close cron. This
 * page exists for the two things the cron cannot do: show the full Roobet
 * names a payout needs (the public page masks them), and draw a closed period
 * whose automatic draw did not happen — the cron missed its window, or Roobet
 * was down at the close.
 *
 * There is no re-roll. drawRaffle returns a saved draw unchanged, so the
 * button below can only ever produce the first result for a period.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Wager Raffle',
  ...PRIVATE_PAGE,
};

export default async function AdminWagerRafflePage() {
  await assertAdmin();

  const zone = scheduleZone(PARTNERS[WAGER_RAFFLE.partnerId].schedule);
  const current = currentRafflePeriod();
  const closed = lastClosedRafflePeriod();

  const [standings, draws, closedDraw] = await Promise.all([
    raffleStandings(current).catch(() => null),
    listDraws(),
    closed ? drawFor(closed) : Promise.resolve(undefined),
  ]);

  async function draw() {
    'use server';
    await assertAdmin();
    const period = lastClosedRafflePeriod();
    if (!period) return;
    await drawRaffle(period);
    revalidatePath('/admin/wager-raffle');
    revalidatePath('/raffle');
  }

  return (
    <>
      <h2 className="admin-group">Wager raffle</h2>

      {closed && !closedDraw && (
        <div className="admin-panel" style={{ marginBottom: 18 }}>
          <div className="admin-panel-head">
            <h2 className="h-section">
              {periodLabel(closed.start.toISOString(), closed.end.toISOString(), zone)} has not been
              drawn
            </h2>
          </div>
          <p className="admin-note">
            The draw normally runs on its own at the close. If it did not — the cron missed its
            window, or Roobet was down — draw it here. It is final: the same period cannot be drawn
            twice.
          </p>
          <form action={draw} style={{ marginTop: 14 }}>
            <ConfirmSubmit
              className="btn btn-primary btn-sm"
              message="Draw the closed period now? The result is final and is shown on the public raffle page."
            >
              Draw Winners
            </ConfirmSubmit>
          </form>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">
            This period <span className="admin-count">{standings?.entrants.length ?? 0}</span>
          </h2>
          <span className="give-conn" data-on>
            {standings ? `${standings.totalTickets.toLocaleString('en-US')} tickets` : 'Roobet unreachable'}
          </span>
        </div>
        <p className="admin-note" style={{ marginBottom: 12 }}>
          {periodLabel(current.start.toISOString(), current.end.toISOString(), zone)} · one ticket per{' '}
          {formatMoney(WAGER_RAFFLE.ticketEvery)} weighted · prizes{' '}
          {WAGER_RAFFLE.prizes.map((p) => formatMoney(p)).join(' / ')}
        </p>
        {standings && standings.entrants.length > 0 ? (
          <div className="admin-list">
            {standings.entrants.map((e) => (
              <div className="admin-bonus" key={e.username}>
                <span className="admin-bonus-game">{e.username}</span>
                <span className="admin-bonus-bet">{e.tickets.toLocaleString('en-US')} tickets</span>
                <span className="admin-bonus-bet">{formatMoney(e.weighted)} weighted</span>
                <span className="admin-bonus-bet" style={{ color: 'var(--dim)' }}>
                  {((e.tickets / standings.totalTickets) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-note">Nobody has a ticket yet this period.</p>
        )}
      </div>

      <div className="admin-panel" style={{ marginTop: 18 }}>
        <div className="admin-panel-head">
          <h2 className="h-section">
            Past draws <span className="admin-count">{draws.length}</span>
          </h2>
        </div>
        {draws.length === 0 ? (
          <p className="admin-note">No draws yet. The first runs at the next close.</p>
        ) : (
          <div className="admin-list">
            {draws.map((d) => (
              <div className="admin-bonus" key={d.periodStart}>
                <span className="admin-bonus-game">
                  {periodLabel(d.periodStart, d.periodEnd, zone)}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--dim)' }}>
                    {d.totalTickets.toLocaleString('en-US')} tickets · {d.entrants} players
                  </span>
                </span>
                {d.winners.length === 0 ? (
                  <span className="admin-bonus-bet">No tickets — nothing drawn</span>
                ) : (
                  d.winners.map((w) => (
                    <span className="admin-bonus-bet" key={w.place}>
                      {w.place}. <b>{w.username}</b> · {formatMoney(w.prize)}
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--dim)' }}>
                        ticket {w.ticket} of {w.poolSize}
                      </span>
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
