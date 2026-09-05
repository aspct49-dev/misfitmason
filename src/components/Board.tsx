import { formatMoney, periodLabel } from '@/lib/format';
import type { Leaderboard, LeaderboardEntry, Partner } from '@/lib/types';
import { Countdown } from './Countdown';
import { CopyCode } from './CopyCode';
import { Podium } from './Podium';

/**
 * One partner's standings.
 *
 * A single ranked list under the podium: with only a few paying places
 * and a small player base, most seats are open most of the time, and a podium
 * built from empty cards looks broken where a list simply looks early. First
 * place is marked with an accent rail instead.
 */
export function Board({
  board,
  partner,
  tabs,
}: {
  board: Leaderboard;
  partner: Partner;
  /** Partner switcher, rendered inside the hero rather than above it. */
  tabs?: React.ReactNode;
}) {
  return (
    <div>
      <div className="lb-hero">
        {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
        <img className="lb-hero-logo" src={partner.logo} alt={partner.name} />

        <h1 className="lb-hero-title">
          <span className="amt">{formatMoney(board.prizePool)}</span> Monthly
          <br />
          Leaderboard
        </h1>

        <p className="lb-hero-sub">
          {partner.comingSoon ? (
            <>
              A {formatMoney(board.prizePool)} {partner.name} board is on the way. Sign up under
              code {partner.code} now and your wagers count from the day it opens.
            </>
          ) : (
            <>
              Play {partner.name} under code {partner.code} and take a share of the pot. Top{' '}
              {partner.prizeTable.length} paid, ranked on {partner.metricLabel.toLowerCase()}, no
              minimum.
            </>
          )}
        </p>

        {tabs}

        <div className="lb-hero-actions">
          <CopyCode code={partner.code} />
          <a className="btn btn-primary" href={partner.signupUrl} target="_blank" rel="noreferrer">
            Play {partner.name}
          </a>
        </div>

        <span className="label lb-hero-period">
          {partner.comingSoon ? 'Not open yet' : periodLabel(board.periodStart)}
        </span>
      </div>

      {partner.comingSoon ? (
        <ComingSoon partner={partner} prizePool={board.prizePool} />
      ) : (
        <Standings board={board} partner={partner} />
      )}
    </div>
  );
}

/**
 * An announced board that has not opened. No podium, no countdown and no
 * standings: there is nothing to stand on, and a board of empty places would
 * read as a live competition nobody has entered rather than one not yet open.
 */
function ComingSoon({ partner, prizePool }: { partner: Partner; prizePool: number }) {
  return (
    <div className="lb-soon">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative prize art */}
      <img className="lb-soon-art" src="/prize-chalice.webp" alt="" aria-hidden />
      <div>
        <span className="label">Coming soon</span>
        <h2 className="lb-soon-title">
          {formatMoney(prizePool)} {partner.name} leaderboard
        </h2>
        <p className="lb-soon-sub">
          The board opens once the {partner.name} integration is live. Register under code{' '}
          <strong>{partner.code}</strong> in the meantime — the account has to exist before wagers
          can be counted, and it cannot be moved to us later.
        </p>
        <div className="lb-hero-actions" style={{ justifyContent: 'flex-start' }}>
          <CopyCode code={partner.code} />
          <a className="btn btn-secondary" href={partner.signupUrl} target="_blank" rel="noreferrer">
            Sign up on {partner.name}
          </a>
        </div>
        <p className="pending">Prize split and start date to be announced</p>
      </div>
    </div>
  );
}

function Standings({ board, partner }: { board: Leaderboard; partner: Partner }) {
  return (
    <>
      <Podium entries={board.entries.slice(0, 3)} />

      <div className="lb-ends">
        <span className="label">Leaderboard ends in</span>
        <Countdown endsAt={board.periodEnd} />
      </div>

      <div className="lb-stats">
        <div className="lb-stats-head">
          <h2>{partner.name} statistics</h2>
          <span className="label">Updated {updatedLabel(board.updatedAt)}</span>
        </div>
        <div className="lb-stats-grid">
          <Stat label="Total players" value={board.stats.players.toLocaleString('en-US')} />
          <Stat label="Total wagered" value={formatMoney(board.stats.totalWagered)} />
          <Stat label="Top wager" value={formatMoney(board.stats.topWager)} />
          <Stat label="Prize pool" value={formatMoney(board.prizePool)} accent />
        </div>
      </div>

      {/* Every paying place, not just the ones the podium left out — the podium
          is the celebration, the table is the reference. */}
      <div className="standings">
        <div className="standings-head">
          <span className="label">Rank</span>
          <span className="label">User</span>
          <span className="label">Wagered</span>
          <span className="label">Reward</span>
        </div>
        {board.entries.map((entry) => (
          <Row key={entry.rank} entry={entry} />
        ))}
      </div>

      <p className="lb-note">
        Usernames are masked for privacy. Standings update as wagers are processed.
      </p>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="lb-stat">
      <span className="label">{label}</span>
      <b className={accent ? 'accent' : undefined}>{value}</b>
    </div>
  );
}

/**
 * Time of the last refresh, pinned to UTC. Formatting in the local zone would
 * render one string on the server and another in the browser, which React
 * reports as a hydration mismatch.
 */
function updatedLabel(iso: string): string {
  return (
    new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="rank-row" data-rank={entry.rank} data-open={entry.unclaimed}>
      <div className="rank-n">{entry.rank}</div>

      <div className="player">
        {entry.tierBadgeUrl && !entry.unclaimed ? (
          // eslint-disable-next-line @next/next/no-img-element -- partner CDN badge, fixed 26px
          <img className="player-badge" src={entry.tierBadgeUrl} alt="" />
        ) : (
          <span className="player-avatar" aria-hidden />
        )}
        <div style={{ minWidth: 0 }}>
          <div className="player-name">{entry.unclaimed ? 'Open place' : entry.username}</div>
          {/* The prize column already says what is at stake here, so an open
              place needs no second line explaining itself. */}
          {!entry.unclaimed && entry.favouriteGame && (
            <div className="player-game">{entry.favouriteGame}</div>
          )}
        </div>
      </div>

      <div className="rank-wager">{entry.unclaimed ? '—' : formatMoney(entry.wagered)}</div>
      <div className="rank-prize">{formatMoney(entry.prize)}</div>
    </div>
  );
}
