import Link from 'next/link';

import { SOCIALS } from '@/lib/partners';

const SOCIAL_LINKS: [string, string][] = [
  ['Kick', SOCIALS.kick],
  ['Twitch', SOCIALS.twitch],
  ['YouTube', SOCIALS.youtube],
  ['TikTok', SOCIALS.tiktok],
  ['X', SOCIALS.x],
  ['Discord', SOCIALS.discord],
];

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ padding: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed 26px brand mark */}
              <img className="brand-logo" src="/mascot.png" alt="" />
              <span className="brand-name">Misfit Mason</span>
            </div>
            <p className="footer-note">
              Community wager leaderboards run by MisfitMason. Affiliate revenue is returned to the
              players who generate it.
            </p>
            <div className="socials">
              {SOCIAL_LINKS.map(([label, href]) => (
                <a key={label} className="social" href={href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Site</h4>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/leaderboards">Leaderboards</Link>
              <Link href="/rewards">Rewards</Link>
              <Link href="/how-it-works">How it works</Link>
            </nav>
          </div>

          <div>
            <h4>Legal</h4>
            <nav>
              <Link href="/legal#rules">Leaderboard rules</Link>
              <Link href="/legal#affiliate">Affiliate disclosure</Link>
              <Link href="/legal#terms">Terms</Link>
              <Link href="/legal#responsible">Responsible gambling</Link>
            </nav>
          </div>
        </div>

        <div className="footer-legal">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: '68ch' }}>
            <span className="age">18+</span>
            <span>
              Gambling involves risk and most players lose money over time. Nothing on this site is a
              prediction or a promise of winnings. Only stake what you can afford to lose.
            </span>
          </div>
          <span>© {new Date().getFullYear()} Misfit Mason</span>
        </div>
      </div>
    </footer>
  );
}
