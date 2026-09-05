import type { Metadata } from 'next';

import { AffiliateRevenue, FreeBattles, Partners } from '@/components/Sections';
import { formatMoney } from '@/lib/format';
import { PARTNERS, PARTNER_ORDER, TOTAL_PRIZE_POOL } from '@/lib/partners';

export const metadata: Metadata = {
  title: 'Rewards — Misfit Mason',
  description:
    'Affiliate revenue returned to players, monthly leaderboard prizes, and free Lootbox battles.',
};

export default function RewardsPage() {
  return (
    <>
      <section className="section wrap" style={{ paddingTop: 40 }}>
        <div className="section-head">
          <h1 className="h-page">Rewards</h1>
        </div>
        <p className="lede">
          Three separate things, funded separately. Two are running now; the third depends on
          detail still to be confirmed.
        </p>

        <div className="grid-3" style={{ marginTop: 24 }}>
          <div className="card">
            <span className="label">Affiliate revenue</span>
            <div className="stat-v accent" style={{ marginTop: 12 }}>
              100%
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
              Returned monthly to the players who generated it.
            </p>
          </div>
          <div className="card">
            <span className="label">Leaderboard prizes</span>
            <div className="stat-v" style={{ marginTop: 12 }}>
              {formatMoney(TOTAL_PRIZE_POOL)}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
              {PARTNER_ORDER.map((id) => `${PARTNERS[id].name} ${formatMoney(PARTNERS[id].prizePool)}`).join(
                ', ',
              )}
              . Paid to the top of each board, funded out of pocket.
            </p>
          </div>
          <div className="card">
            <span className="label">Free battles</span>
            <div className="stat-v text" style={{ marginTop: 12 }}>
              Lootbox
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
              Entries for depositors registered under the referral link.
            </p>
          </div>
        </div>
      </section>

      <AffiliateRevenue />
      <FreeBattles />
      <Partners />
    </>
  );
}
