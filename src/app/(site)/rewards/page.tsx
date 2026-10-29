import type { Metadata } from 'next';
import Link from 'next/link';

import { Partners } from '@/components/Sections';
import { REWARDS_HEADLINE, REWARDS_LINEUP, PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';

const description = `${REWARDS_HEADLINE} on ${PRIMARY_PARTNER.name}: a $750 bi-weekly leaderboard, $250 in monthly wager milestones, a $100 bi-weekly raffle, a first-time deposit bonus and VIP transfers.`;

export const metadata: Metadata = {
  title: 'Rewards',
  description,
  alternates: { canonical: '/rewards' },
  openGraph: { title: 'Rewards', description, url: '/rewards' },
};

/**
 * The rewards line-up, as the client states it — the page that replaced the
 * affiliate-revenue claim. Each card points at the page where that reward
 * actually runs, so this is the overview and never a second copy of the rules.
 */
export default function RewardsPage() {
  return (
    <>
      <section className="section wrap claim" style={{ paddingBottom: 0 }}>
        <span className="claim-kicker">Rewards under code {PRIMARY_PARTNER.code}</span>
        <h1 className="claim-title">{REWARDS_HEADLINE}</h1>
        <p className="claim-lede">
          Play {PRIMARY_PARTNER.name} under code <b>{PRIMARY_PARTNER.code}</b> and every one of these
          applies to you. Nothing to opt into.
        </p>
      </section>

      <section className="section wrap">
        <div className="rwd-grid">
          {REWARDS_LINEUP.map((r) => {
            const external = r.href === 'DISCORD';
            const href = external ? SOCIALS.discord : r.href;
            const body = (
              <>
                <span className="rwd-figure">{r.figure}</span>
                <h2>{r.title}</h2>
                <p>{r.detail}</p>
                <span className="rwd-cta">{r.cta} →</span>
              </>
            );
            return external ? (
              <a className="rwd-card" key={r.id} href={href} target="_blank" rel="noreferrer">
                {body}
              </a>
            ) : (
              <Link className="rwd-card" key={r.id} href={href}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>

      <Partners />
    </>
  );
}
