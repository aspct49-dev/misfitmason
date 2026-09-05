import { SiKick } from 'react-icons/si';

import { PARTNERS, PARTNER_ORDER, SOCIALS } from '@/lib/partners';

/**
 * The full-width brand rows every site in this category runs under the fold:
 * mark on the left, one line of copy in the middle, the way in on the right.
 *
 * The call to action carries each platform's own colour, which is the
 * convention and reads as "theirs, not ours" — the rest of the site stays on
 * the single crimson accent.
 */
export function BrandStrips() {
  return (
    <section className="section wrap">
      <div className="strip-list">
        <div
          className="strip"
          style={{ ['--brand' as string]: '#53fc18', ['--brand-deep' as string]: '#2f9c0c' }}
        >
          <span className="strip-mark">
            <SiKick aria-hidden focusable="false" />
          </span>
          <p className="strip-msg">
            <span className="strip-dot" />
            Watch <b>live</b> for bonus hunts, giveaways &amp; more
          </p>
          <a className="strip-btn" href={SOCIALS.kick} target="_blank" rel="noreferrer">
            Watch live
          </a>
        </div>

        {PARTNER_ORDER.map((id) => {
          const p = PARTNERS[id];
          return (
            <div
              className="strip"
              key={id}
              style={{ ['--brand' as string]: '#e31b45', ['--brand-deep' as string]: '#8d0f2c' }}
            >
              <span className="strip-mark strip-mark-img">
                {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
                <img src={p.logo} alt={p.name} />
              </span>
              <p className="strip-msg">
                {p.comingSoon ? (
                  <>
                    Board opening soon — register under code <b>{p.code}</b> to be ready
                  </>
                ) : (
                  <>
                    Register using code <b>{p.code}</b> to join the leaderboard
                  </>
                )}
              </p>
              <a className="strip-btn" href={p.signupUrl} target="_blank" rel="noreferrer">
                {p.comingSoon ? 'Sign up' : 'Claim bonus'}
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
