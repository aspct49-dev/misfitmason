import { formatMoney } from '@/lib/format';
import type { LeaderboardEntry } from '@/lib/types';

/**
 * Top three as hanging banners, in the nsbrooklyn pattern: the frame artwork
 * *is* the card — no CSS border or background of its own — and the content is
 * positioned inside its cloth interior.
 *
 * Rendered 2nd, 1st, 3rd so first place sits in the middle, and the outer two
 * are pushed down so it also sits raised.
 *
 * The inset percentages come from measuring the artwork: the cloth of the
 * standard frame runs from 4.9% to 71.8% of its height, the champion frame from
 * 16.1% to 64.2%. Content outside those bands lands on the metalwork.
 */

const EMBLEM: Record<number, string> = {
  1: '/rank-crown.webp',
  2: '/rank-double.webp',
  3: '/rank-single.webp',
};

const PLACE: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

function Seat({ entry }: { entry: LeaderboardEntry }) {
  const first = entry.rank === 1;

  return (
    <article className={`lb-seat lb-seat-${entry.rank}`} data-open={entry.unclaimed}>
      <div className="lb-banner">
        <div className="lb-banner-inner">
          <div className="lb-seat-top">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative rank emblem */}
            <img className="lb-emblem" src={EMBLEM[entry.rank]} alt="" aria-hidden />
            <span className="lb-place">{PLACE[entry.rank]}</span>
          </div>

          <div className="lb-seat-mid">
            {entry.tierBadgeUrl && !entry.unclaimed ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner CDN badge
              <img className="lb-avatar" src={entry.tierBadgeUrl} alt="" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- placeholder medallion
              <img className="lb-avatar" src="/seat-empty.webp" alt="" aria-hidden />
            )}
            <div className="lb-name">{entry.unclaimed ? 'Open' : entry.username}</div>
          </div>

          <div className="lb-prize">{formatMoney(entry.prize)}</div>
        </div>
      </div>

      {/* Below the banner: the cloth interior is too narrow to carry a fourth
          line without the name and prize losing their weight. */}
      <div className="lb-wager">
        <span className="label">Wagered</span>
        <b>{entry.unclaimed ? '—' : formatMoney(entry.wagered)}</b>
      </div>

      {first && entry.unclaimed && <div className="lb-open-note">Nobody has taken it</div>}
    </article>
  );
}

export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const [first, second, third] = entries;
  const order = [second, first, third].filter(Boolean);

  return (
    <div className="lb-podium">
      {order.map((entry) => (
        <Seat key={entry.rank} entry={entry} />
      ))}
    </div>
  );
}
