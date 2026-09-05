'use client';

import { useEffect, useState } from 'react';

/**
 * Time left in the leaderboard period.
 *
 * Renders placeholders until mounted: the server's clock and the visitor's do
 * not agree to the second, and a hydration mismatch on the most-watched number
 * on the page is not worth the millisecond it would save.
 */
export function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const s = Math.floor((left ?? 0) / 1000);
  const cells: [number, string][] = [
    [Math.floor(s / 86400), 'Days'],
    [Math.floor(s / 3600) % 24, 'Hours'],
    [Math.floor(s / 60) % 60, 'Min'],
    [s % 60, 'Sec'],
  ];

  return (
    <div className="cd-cells">
      {cells.map(([value, label]) => (
        <div className="cd-cell" key={label}>
          <div className="cd-num">{left === null ? '––' : String(value).padStart(2, '0')}</div>
          <div className="cd-lbl">{label}</div>
        </div>
      ))}
    </div>
  );
}
