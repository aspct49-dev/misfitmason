'use client';

import { useState } from 'react';

import { PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import type { Leaderboard, PartnerId } from '@/lib/types';
import { Board } from './Board';

/**
 * Partner switcher. Both boards are fetched on the server and passed down, so
 * switching is instant and there is no client-side data fetching anywhere.
 */
export function LeaderboardTabs({ boards }: { boards: Record<PartnerId, Leaderboard> }) {
  const [active, setActive] = useState<PartnerId>('roobet');
  const board = boards[active];

  const tabs = (
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

      <Board board={board} partner={PARTNERS[active]} tabs={tabs} />
    </div>
  );
}
