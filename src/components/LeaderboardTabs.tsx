'use client';

import { useState } from 'react';

import { PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import type { Leaderboard, PartnerId } from '@/lib/types';
import { Board } from './Board';

/**
 * Partner switcher. Every board is fetched on the server and passed down, so
 * switching is instant and there is no client-side data fetching anywhere.
 *
 * With one partner there is nothing to switch between, so the row is dropped
 * rather than rendered as a single permanently-selected tab.
 */
export function LeaderboardTabs({
  boards,
  previous,
}: {
  boards: Record<PartnerId, Leaderboard>;
  /** Each partner's last closed period, or null before one has closed. */
  previous?: Record<PartnerId, Leaderboard | null>;
}) {
  const [active, setActive] = useState<PartnerId>(PARTNER_ORDER[0]);
  const [view, setView] = useState<'current' | 'previous'>('current');
  const prior = previous?.[active] ?? null;
  // Falls back to the live board if the partner has no closed period yet, so a
  // stale "previous" choice never leaves the page empty.
  const board = view === 'previous' && prior ? prior : boards[active];

  /* Current or the last closed period. Both are server-fetched, so switching
     is instant; the closed one renders with "Final standings" in place of a
     countdown, so it cannot be mistaken for the live table. */
  const periodSwitch = prior ? (
    <div className="tabs lb-period-tabs" role="tablist" aria-label="Leaderboard period">
      {(['current', 'previous'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          className="tab"
          data-active={view === v}
          aria-selected={view === v}
          onClick={() => setView(v)}
        >
          {v === 'current' ? 'Current' : 'Previous'}
        </button>
      ))}
    </div>
  ) : null;

  const partnerTabs = PARTNER_ORDER.length < 2 ? undefined : (
    <div className="tabs" role="tablist" aria-label="Partner leaderboards">
      {PARTNER_ORDER.map((id) => {
        const partner = PARTNERS[id];
        const selected = active === id;
        return (
          <button
            key={id}
            role="tab"
            className="tab tab-brand"
            data-active={selected}
            aria-selected={selected}
            onClick={() => setActive(id)}
          >
            {/* The mark alone. The pot and the board's status are both stated in
                the hero directly below, so repeating them here was noise.
                alt carries the name for screen readers. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
            <img src={partner.logo} alt={partner.name} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      {board.source === 'mock' && !PARTNERS[active].comingSoon && (
        <p className="notice">
          <span className="notice-mark">i</span>
          {board.error
            ? 'Live standings are temporarily unavailable. The figures below are sample data.'
            : `${PARTNERS[active].name} does not yet provide an affiliate API, so the standings below are sample data rather than live results.`}
        </p>
      )}

      <Board
        board={board}
        partner={PARTNERS[active]}
        tabs={
          partnerTabs || periodSwitch ? (
            <>
              {partnerTabs}
              {periodSwitch}
            </>
          ) : undefined
        }
      />
    </div>
  );
}
