import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import type { Leaderboard, LeaderboardEntry, Partner } from '@/lib/types';

/**
 * Leaderboard promo: the pot and a call to action on the left, the top three on
 * the right as a podium.
 *
 * Rendered 2 / 1 / 3 so first place sits in the middle and stands taller. Open
 * places still appear, because hiding them would misrepresent how contested the
 * board is.
 */
export function PromoBoard({ board, partner }: { board: Leaderboard; partner: Partner }) {
  const [first, second, third] = board.entries;
  const order: LeaderboardEntry[] = [second, first, third];

  return (
    <section className="section wrap">
      <div className="promo">
        <div>
          <span className="label">
            {partner.name} · {board.source === 'mock' ? 'Sample standings' : 'Live standings'}
          </span>
          <h2 style={{ marginTop: 12 }}>
            <span>{formatMoney(board.prizePool)}</span> leaderboard
          </h2>
          <p>
            Climb the {partner.name} board under code {partner.code} and take a share of the pot.
            Top {partner.prizeTable.length} are paid at the end of the month.
          </p>
          <Link className="btn btn-primary" href="/leaderboards">
            View leaderboard
          </Link>
        </div>

        <div className="podium">
          {order.map((entry) => (
            <div className={`pod pod-${entry.rank}`} key={entry.rank}>
              <div className="pod-card">
                <span className="pod-place">#{entry.rank}</span>
                {entry.tierBadgeUrl && !entry.unclaimed ? (
                  // eslint-disable-next-line @next/next/no-img-element -- partner CDN badge
                  <img className="pod-badge" src={entry.tierBadgeUrl} alt="" />
                ) : (
                  <span className="pod-avatar" aria-hidden />
                )}
                <span className="pod-name">{entry.unclaimed ? 'Open place' : entry.username}</span>
                <span className="pod-label">Wagered</span>
                <span className="pod-wager">{entry.unclaimed ? '—' : formatMoney(entry.wagered)}</span>
              </div>
              <div className="pod-ribbon">{formatMoney(entry.prize)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
