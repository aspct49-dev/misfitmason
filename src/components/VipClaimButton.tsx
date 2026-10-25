'use client';

import { useState } from 'react';

/**
 * Claims one level. Server-checked: the button only appears when the page
 * believed the level was reached, but the route checks Roobet again before
 * filing anything.
 */
export function VipClaimButton({ level }: { level: number }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setState('busy');
    setError(null);
    try {
      const res = await fetch('/api/vip-rewards/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Could not claim that. Try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Could not reach the server. Try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return <span className="vipr-btn vipr-btn-done">Claimed · In Review</span>;
  }

  return (
    <>
      <button className="vipr-btn vipr-btn-claim" onClick={claim} disabled={state === 'busy'}>
        {state === 'busy' ? 'Claiming…' : 'Claim Reward'}
      </button>
      {error && (
        <p className="vipr-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
