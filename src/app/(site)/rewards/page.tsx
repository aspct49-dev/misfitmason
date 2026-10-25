import type { Metadata } from 'next';
import Link from 'next/link';

import { AffiliateRevenue, Partners } from '@/components/Sections';
import { formatMoney } from '@/lib/format';
import { PARTNERS, PARTNER_ORDER, TOTAL_PRIZE_POOL } from '@/lib/partners';

export const metadata: Metadata = {
  title: 'Rewards',
  description: '100% of affiliate revenue returned to players, $750 in bi-weekly Roobet leaderboard prizes across five paying places, and VIP transfers.',
  alternates: { canonical: '/rewards' },
  openGraph: { title: 'Rewards', description: '100% of affiliate revenue returned to players, $750 in bi-weekly Roobet leaderboard prizes across five paying places, and VIP transfers.', url: '/rewards' },
};

export default function RewardsPage() {
  return (
    <>
      <section className="section wrap" style={{ paddingTop: 40 }}>
        <div className="section-head">
          <h1 className="h-page">Rewards</h1>
        </div>
        <p className="lede">
          Three separate things, funded separately, and all three are running now.
        </p>

        <div className="grid-3" style={{ marginTop: 24 }}>
          <Link className="card card-link" href="/claim">
            <span className="label">Affiliate revenue</span>
            <div className="stat-v accent" style={{ marginTop: 12 }}>
              100%
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
              Returned to the players who generated it. Claim your share.
            </p>
          </Link>
          <Link className="card card-link" href="/vip-transfer">
            <span className="label">VIP transfer</span>
            <div className="stat-v text" style={{ marginTop: 12 }}>
              Matched
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
              Already a VIP elsewhere? Apply to have the level carried over.
            </p>
          </Link>
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
        </div>
      </section>

      <AffiliateRevenue />
      <Partners />
    </>
  );
}
