import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { AFFILIATE_RETURN, PARTNERS, TOTAL_PRIZE_POOL } from '@/lib/partners';

/**
 * The four-across row of entry points that sits near the foot of the page on
 * every site in this category. Each one leads somewhere real.
 */
export function Tiles() {
  return (
    <section className="section wrap">
      <div className="center-head">
        <h2>Everything else</h2>
      </div>

      <div className="tile-grid">
        <Link className="tile" href="/leaderboards">
          <span className="tile-value">{formatMoney(TOTAL_PRIZE_POOL)}</span>
          <h3>Leaderboards</h3>
          <p>Live Shuffle standings and the Lootbox board, with full rules.</p>
        </Link>

        <Link className="tile" href="/rewards">
          <span className="tile-value">{AFFILIATE_RETURN.percentage}%</span>
          <h3>Affiliate revenue</h3>
          <p>All of it returned monthly to the players who generated it.</p>
        </Link>

        <Link className="tile" href="/rewards#battles">
          <span className="tile-value">Free</span>
          <h3>Battles</h3>
          <p>Entries for {PARTNERS.lootbox.name} depositors under the referral link.</p>
        </Link>

        <Link className="tile" href="/how-it-works">
          <span className="tile-value">3</span>
          <h3>How it works</h3>
          <p>Three steps from signing up to being paid at month end.</p>
        </Link>
      </div>
    </section>
  );
}
