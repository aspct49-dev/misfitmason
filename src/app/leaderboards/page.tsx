import type { Metadata } from 'next';

import { LeaderboardTabs } from '@/components/LeaderboardTabs';
import { PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import { getAllLeaderboards } from '@/lib/services/leaderboard';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Leaderboards',
  description: 'Live standings for the $750 Roobet and $500 Lootbox bi-weekly wager leaderboards, top five paid on each. Periods run 1st-15th and 16th-end of month, UTC.',
  alternates: { canonical: '/leaderboards' },
  openGraph: { title: 'Leaderboards', description: 'Live standings for the $750 Roobet and $500 Lootbox bi-weekly wager leaderboards, top five paid on each. Periods run 1st-15th and 16th-end of month, UTC.', url: '/leaderboards' },
};

export default async function LeaderboardsPage() {
  const boards = await getAllLeaderboards();

  return (
    <>
      {/* No page title: the board hero carries the heading for whichever
          partner is selected. */}
      <section className="section wrap" style={{ paddingTop: 32 }}>
        <LeaderboardTabs boards={boards} />
      </section>

      <section className="section wrap" id="rules">
        <div className="center-head">
          <h2>Rules</h2>
        </div>

        <ul className="rules-list">
          {PARTNER_ORDER.map((id) => (
            <li key={id}>
              <strong>{PARTNERS[id].name}:</strong> a ${PARTNERS[id].prizePool} pool{' '}
              {PARTNERS[id].comingSoon
                ? 'with the split to be announced before it opens.'
                : `paid ${PARTNERS[id].prizeTable.map((p) => `$${p}`).join(' / ')} to the top ${PARTNERS[id].prizeTable.length}.`}
            </li>
          ))}
          {PARTNER_ORDER.filter((id) => !PARTNERS[id].comingSoon).map((id) => (
            <li key={`metric-${id}`}>
              {PARTNERS[id].name} is ranked on{' '}
              <strong>{PARTNERS[id].metricLabel.toLowerCase()}</strong> during the period
              {PARTNERS[id].weighted
                ? `, as calculated by ${PARTNERS[id].name} from the house edge of each game. See the note under its standings.`
                : '. This is the raw figure, not weighted by house edge.'}
            </li>
          ))}
          <li>There is no minimum to qualify and nothing to opt into.</li>
          <li>
            <strong>No wager abuse.</strong> Low-risk, hedged or zero-edge play used only to inflate
            a wagered total does not count, and will be removed from the board.
          </li>
          <li>
            Entry requires an account registered through the partner&apos;s referral link on this
            site. Casinos do not transfer existing accounts between affiliates.
          </li>
          <li>
            Periods run <strong>twice a month</strong>: the 1st to the 15th, and the 16th to the
            last day. Each one opens and closes at 00:00 UTC.
          </li>
          <li>Usernames are shown masked to their last four characters.</li>
          <li>
            Prize pools are funded personally by MisfitMason and are separate from the affiliate
            revenue return.
          </li>
          <li>Multiple accounts, or any attempt to manipulate the board, void a prize.</li>
          <li>
            <strong>MisfitMason has the final say</strong> on standings, eligibility, disputes and
            prize decisions.
          </li>
          <li className="rules-note">
            Standings refresh roughly once a minute and depend on each casino&apos;s own reporting,
            which can lag or be corrected. The figures shown are not a statement of account.
          </li>
        </ul>
      </section>
    </>
  );
}
