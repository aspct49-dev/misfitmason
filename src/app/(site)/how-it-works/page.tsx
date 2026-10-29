import type { Metadata } from 'next';

import { GettingStarted, Partners } from '@/components/Sections';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How the leaderboard, the raffle, the wager milestones and the deposit bonus work on Roobet under code MisfitMason, in three steps.',
  alternates: { canonical: '/how-it-works' },
  openGraph: { title: 'How it works', description: 'How the leaderboard, the raffle, the wager milestones and the deposit bonus work on Roobet under code MisfitMason, in three steps.', url: '/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="section wrap" style={{ paddingTop: 40 }}>
        <div className="section-head">
          <h1 className="h-page">How it works</h1>
        </div>
        <div className="prose">
          <p>
            Sign up on Roobet under code MisfitMason and your play counts toward everything on this
            site at once: the bi-weekly leaderboard, the raffle, and the monthly wager milestones.
            There is nothing to opt into, and it costs nothing extra or changes how any game
            behaves.
          </p>
          <p>
            All three run on Roobet&apos;s weighted wager — the figure Roobet discounts by each
            game&apos;s RTP — so a dollar through a high-RTP game like dice counts for less than a
            dollar through slots. The leaderboard ranks on it, the raffle gives a ticket for every
            $75 of it, and the milestones pay out as it passes each level.
          </p>
          <p>
            The rewards are funded by MisfitMason. New depositors also get a first-time deposit
            bonus, and players with a VIP level elsewhere can apply to have it matched.
          </p>
        </div>
      </section>

      <GettingStarted />
      <Partners />
    </>
  );
}
