import type { Metadata } from 'next';

import { GettingStarted, Partners } from '@/components/Sections';

export const metadata: Metadata = {
  title: 'How it works — Misfit Mason',
  description:
    'How affiliate revenue, the monthly leaderboards and free battles fit together on Misfit Mason.',
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
            Casinos run affiliate programmes that pay a share of the revenue a referred player
            generates. That share is usually kept by whoever referred the player. On Misfit Mason
            it is returned to the players instead.
          </p>
          <p>
            Registering through the referral links means a portion of what the casino makes from
            your play comes back to you rather than staying with the operator or the affiliate. It
            costs nothing extra and does not change how any game behaves.
          </p>
          <p>
            The monthly leaderboards are a separate arrangement, funded out of pocket, so that
            there is something to compete for rather than only something to claim.
          </p>
        </div>
      </section>

      <GettingStarted />
      <Partners />
    </>
  );
}
