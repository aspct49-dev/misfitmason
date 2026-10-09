import type { Metadata } from 'next';

import { CopyCode } from '@/components/CopyCode';
import { CHALLENGES, CHALLENGE_POOL } from '@/lib/challenges';
import { formatMoney } from '@/lib/format';
import { PARTNERS, SOCIALS } from '@/lib/partners';
import type { Challenge } from '@/lib/types';

const partner = PARTNERS.roobet;
const description = `Slot challenges on ${partner.name}: hit the target multiplier at the stated bet under code ${partner.code} and claim the prize. ${formatMoney(CHALLENGE_POOL)} on the table.`;

export const metadata: Metadata = {
  title: 'Challenges',
  description,
  alternates: { canonical: '/challenges' },
  openGraph: { title: 'Challenges', description, url: '/challenges' },
};

export default function ChallengesPage() {
  const active = CHALLENGES.filter((c) => c.status === 'active');
  const claimed = CHALLENGES.filter((c) => c.status === 'claimed');

  return (
    <>
      <section className="section wrap claim" style={{ paddingBottom: 0 }}>
        <span className="claim-kicker">Slot challenges</span>

        <h1 className="claim-title">
          Hit it, <span className="amt">claim it</span>
        </h1>

        <p className="claim-lede">
          Land the target multiplier on any of these under code <b>{partner.code}</b>, then post the
          clip in the Discord to collect. {formatMoney(CHALLENGE_POOL)} on the table right now.
        </p>

        <div className="chal-actions">
          <CopyCode code={partner.code} />
          <a className="btn btn-primary" href={partner.signupUrl} target="_blank" rel="noreferrer">
            Play {partner.name}
          </a>
        </div>
      </section>

      <section className="section wrap">
        {active.length === 0 ? (
          <p className="chal-empty">No challenges live right now — check back soon.</p>
        ) : (
          <div className="chal-grid">
            {active.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}

        {claimed.length > 0 && (
          <>
            <div className="section-head" style={{ marginTop: 34 }}>
              <h2 className="h-section">Already claimed</h2>
            </div>
            <div className="chal-grid">
              {claimed.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </>
        )}

        <div className="card chal-rules">
          <h2 className="h-section" style={{ fontSize: 16 }}>
            How to claim
          </h2>
          <ul className="claim-steps">
            <li>
              Play on an account registered under code <strong>{partner.code}</strong>. Accounts
              opened elsewhere cannot be counted.
            </li>
            <li>
              The hit has to be at the stated bet size. A bigger stake does not count, even for a
              bigger multiplier.
            </li>
            <li>
              Record it. A clip or a full screenshot showing the game, the bet and the multiplier is
              what gets paid — a cropped number is not.
            </li>
            <li>
              Post it in the{' '}
              <a className="link" href={SOCIALS.discord} target="_blank" rel="noreferrer">
                Discord
              </a>
              . First valid proof takes the prize, and the challenge closes.
            </li>
          </ul>
          <p className="claim-note" style={{ margin: '14px 0 0', maxWidth: 'none' }}>
            Challenges are funded out of pocket, like the leaderboard prizes, and MisfitMason has
            the final say on whether proof is valid.
          </p>
        </div>
      </section>
    </>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const done = challenge.status === 'claimed';

  return (
    <article className="chal-card" data-done={done}>
      {/* The multiplier is the whole proposition, so it is the only thing set
          large. There is no slot artwork on this site to put behind it, and a
          scraped promo image would be the one unlicensed asset on the page. */}
      <div className="chal-target">
        <b>{challenge.multiplier.toLocaleString('en-US')}</b>
        <span>×</span>
      </div>

      <div className="chal-meta">
        <h3>{challenge.game}</h3>
        <span className="chal-provider">{challenge.provider}</span>
      </div>

      <p className="chal-req">
        {challenge.requirement} {challenge.multiplier.toLocaleString('en-US')}× at a{' '}
        {formatMoney(challenge.bet, { cents: true })} bet.
      </p>

      <div className="chal-foot">
        <span className="chal-prize">{formatMoney(challenge.prize)}</span>
        {done ? (
          <span className="chal-status">Claimed{challenge.claimedBy ? ` — ${challenge.claimedBy}` : ''}</span>
        ) : (
          <span className="chal-status chal-live">Open</span>
        )}
      </div>
    </article>
  );
}
