import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { TOTAL_PRIZE_POOL } from '@/lib/partners';
import { VIP_REWARD_TOTAL } from '@/lib/vip-rewards';
import { WAGER_RAFFLE_POOL } from '@/lib/wager-raffle';

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
          <p>Live Roobet standings for the current period, with full rules.</p>
        </Link>

        <Link className="tile" href="/raffle">
          <span className="tile-value">{formatMoney(WAGER_RAFFLE_POOL)}</span>
          <h3>Bi-weekly raffle</h3>
          <p>A ticket for every $75 of weighted wager, drawn at each close.</p>
        </Link>

        <Link className="tile" href="/vip-rewards">
          <span className="tile-value">{formatMoney(VIP_REWARD_TOTAL)}</span>
          <h3>Wager milestones</h3>
          <p>Four monthly levels, each paid as you reach it.</p>
        </Link>

        <Link className="tile" href="/how-it-works">
          <span className="tile-value">3</span>
          <h3>How it works</h3>
          <p>Three steps from signing up to being paid at period end.</p>
        </Link>
      </div>
    </section>
  );
}
