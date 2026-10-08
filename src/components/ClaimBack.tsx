'use client';

import { useState } from 'react';

import { AFFILIATE_RETURN, PARTNERS } from '@/lib/partners';
import { MAX_DISCORD_LENGTH, MAX_NOTE_LENGTH, MAX_USERNAME_LENGTH } from '@/lib/claim';

/**
 * The affiliate-revenue claim form.
 *
 * It opens a claim; it does not pay one. The copy says so plainly, because a
 * form that looks like a cashier and behaves like a ticket queue is the fastest
 * way to lose the trust the return is meant to build.
 *
 * The Discord webhook is never touched from here — the submit goes to
 * /api/claim, which holds the URL server-side.
 */
export function ClaimBack() {
  const [username, setUsername] = useState('');
  const [discord, setDiscord] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner = PARTNERS.roobet;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, discord, note }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Could not send that claim. Try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section wrap" id="claim">
      <div className="section-head">
        <h2 className="h-section">Claim your share</h2>
      </div>

      <div className="grid-2 claim-grid">
        <div>
          <p className="lede">
            {AFFILIATE_RETURN.percentage}% of the affiliate revenue your play generates goes back to
            you. Send your {partner.name} username and a Discord handle, and the claim opens in the
            Discord for review.
          </p>
          <ul className="claim-steps">
            <li>Your account has to be registered under code {partner.code}.</li>
            <li>Claims are reviewed against the affiliate statistics before anything is paid.</li>
            <li>Payouts run on the {AFFILIATE_RETURN.cadence.toLowerCase()} cycle, by hand.</li>
            <li>One claim per day. Nothing is paid out automatically from this form.</li>
          </ul>
        </div>

        <div className="card claim-card">
          {done ? (
            <div className="claim-done">
              <span className="label">Claim received</span>
              <p>
                It is now in the Discord for review. If anything is missing, you will be asked there
                — so make sure that handle can be messaged.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="claim-field">
                <span className="label">{partner.name} username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={MAX_USERNAME_LENGTH}
                  autoComplete="off"
                  required
                  placeholder="As it appears on your account"
                />
              </label>

              <label className="claim-field">
                <span className="label">Discord handle</span>
                <input
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  maxLength={MAX_DISCORD_LENGTH}
                  autoComplete="off"
                  required
                  placeholder="username, not a nickname"
                />
              </label>

              <label className="claim-field">
                <span className="label">Anything else (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_NOTE_LENGTH}
                  rows={3}
                  placeholder="Period you are claiming for, payment preference…"
                />
              </label>

              {error && (
                <p className="claim-error" role="alert">
                  {error}
                </p>
              )}

              <button className="btn btn-primary claim-submit" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Open A Claim'}
              </button>

              <p className="claim-note">
                Your username and handle are sent to the Discord so the claim can be checked and
                paid. Nothing else is collected and nothing is stored on this site.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
