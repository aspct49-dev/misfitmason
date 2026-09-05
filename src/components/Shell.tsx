'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PARTNERS, SOCIALS } from '@/lib/partners';
import { formatMoney } from '@/lib/format';
import { SOCIAL_LINKS } from './socials';

/**
 * Sidebar on desktop, drawer below 1024px.
 *
 * Four destinations, all of which have content. Gumbo carries nine and six of
 * them render "no active raffles" — a nav item that leads nowhere costs more
 * than the feature it advertises.
 */

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/leaderboards', label: 'Leaderboards', showPot: true },
  { href: '/rewards', label: 'Rewards' },
  { href: '/how-it-works', label: 'How it works' },
];

export function Shell({ totalPot, children }: { totalPot: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
      <aside className="sidebar" data-open={open} id="sidebar">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed 26px brand mark */}
          <img className="brand-logo" src="/mascot.png" alt="" />
          <span className="brand-name">Misfit Mason</span>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              data-active={pathname === item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
              {item.showPot && <span className="nav-badge">{formatMoney(totalPot)}</span>}
            </Link>
          ))}
        </nav>

        <div className="side-divider" />

        {/* Flows straight on from the nav rather than being pinned to the
            bottom, which left a tall dead gap in the middle of the sidebar. */}
        <div className="side-foot">
          <LiveChip />

          <a
            className="side-link side-link-brand"
            href={PARTNERS.roobet.signupUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Play on ${PARTNERS.roobet.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
            <img src={PARTNERS.roobet.logo} alt="" aria-hidden />
          </a>

          {SOCIAL_LINKS.map(({ key, href, cta, Icon, brand }) => (
            <a
              key={key}
              className="side-link"
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{ ['--brand' as string]: brand }}
            >
              <Icon aria-hidden focusable="false" />
              {cta}
            </a>
          ))}
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}

      <div className="main">
        <header className="topbar">
          <button
            className="burger"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="sidebar"
          >
            <span />
            <span />
            <span />
          </button>
          <Link href="/" className="brand" style={{ padding: 0, flex: 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed 26px brand mark */}
            <img className="brand-logo" src="/mascot.png" alt="" />
            <span className="brand-name">Misfit Mason</span>
          </Link>
          <a className="btn btn-secondary btn-sm" href={SOCIALS.kick} target="_blank" rel="noreferrer">
            Kick
          </a>
        </header>
        {children}
      </div>
    </div>
  );
}

/**
 * PLACEHOLDER: fixed offline until Kick credentials are supplied, at which point
 * this reads the channel's real state. Cyan is reserved for this one indicator,
 * so an always-on chip would spend the site's only bright colour on nothing.
 */
function LiveChip() {
  const isLive = false;
  return (
    <a className="live-chip" data-live={isLive} href={SOCIALS.kick} target="_blank" rel="noreferrer">
      <span className="live-dot" />
      {isLive ? 'Live on Kick' : 'Offline'}
    </a>
  );
}
