'use client';

import { useEffect, useState } from 'react';
import { FaDiscord } from 'react-icons/fa';

import { MAX_NOTE_LENGTH, MAX_USERNAME_LENGTH } from '@/lib/claim';
import { AFFILIATE_RETURN, PARTNERS } from '@/lib/partners';
import type { SessionUser } from '@/lib/session';

/**
 * The claim form.
 *
 * It opens a claim; it does not pay one. The copy says so plainly, because a
 * form that looks like a cashier and behaves like a ticket queue is the fastest
 * way to lose the trust the return is meant to build.
 *
 * The webhook is never touched from here — the submit goes to /api/claim, which
 * holds the URL server-side and checks the Discord session.
 */

const LOGIN_ERRORS: Record<string, string> = {
  not_configured: 'Discord sign-in is not configured yet.',
  denied: 'You cancelled the Discord sign-in.',
  no_code: 'Discord did not send a sign-in code. Try again.',
  bad_state: 'That sign-in link expired. Try again.',
  token_exchange: 'Discord rejected the sign-in. Try again.',
  profile: 'Could not read your Discord profile. Try again.',
  auth_failed: 'Something went wrong signing you in. Try again.',
};

/**
 * A clock that only starts in the browser, so the server and the first client
 * render agree (no hydration mismatch) and the countdown runs off the viewer's
 * own clock rather than a duration that was stale on arrival.
 */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function ClaimForm({
  user,
  cooldownExpiresAt,
  loginError,
}: {
  user: SessionUser | null;
  cooldownExpiresAt: number;
  loginError: string | null;
}) {
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [expiresAt, setExpiresAt] = useState(cooldownExpiresAt);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const partner = PARTNERS.roobet;

  const now = useNow(expiresAt > 0);
  // Before the clock starts, take the server's word that a cooldown exists.
  const remaining = now === null ? (expiresAt > 0 ? 1 : 0) : Math.max(0, expiresAt - now);
  const onCooldown = remaining > 0;

  const error =
    submitError ??
    (loginError ? (LOGIN_ERRORS[loginError] ?? 'Sign-in failed. Try again.') : null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || onCooldown) return;

    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, note }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        cooldownExpiresAt?: number;
      };
      if (!res.ok) {
        if (body.cooldownExpiresAt) setExpiresAt(body.cooldownExpiresAt);
        setSubmitError(body.error ?? 'Could not send that claim. Try again.');
        return;
      }
      setDone(true);
      setExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
    } catch {
      setSubmitError('Could not reach the server. Check your connection and try again.');
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
            you. Sign in with Discord, send your {partner.name} username, and the claim opens in the
            Discord for review.
          </p>
          <ul className="claim-steps">
            <li>Your account has to be registered under code {partner.code}.</li>
            <li>Claims are checked against the affiliate statistics before anything is paid.</li>
            <li>Payouts run on the {AFFILIATE_RETURN.cadence.toLowerCase()} cycle, by hand.</li>
            <li>One claim per Discord account every 24 hours.</li>
          </ul>
        </div>

        <div className="card claim-card">
          {error && (
            <p className="claim-error" role="alert">
              {error}
            </p>
          )}

          {!user ? (
            <div className="claim-signin">
              <span className="label">Step one</span>
              <p>
                Sign in so the claim carries an account we can pay and reply to. Discord tells us
                your username and avatar, nothing else.
              </p>
              <a className="btn btn-primary claim-submit" href="/api/auth/discord/login">
                <FaDiscord aria-hidden /> Sign In With Discord
              </a>
            </div>
          ) : done ? (
            <div className="claim-done">
              <span className="label">Claim received</span>
              <p>
                It is in the Discord for review. If anything is missing you will be asked there, so
                keep an eye on your DMs.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="claim-user">
                {/* eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar, fixed 32px */}
                {user.avatarUrl && <img src={user.avatarUrl} alt="" />}
                <div>
                  <span className="label">Signed in</span>
                  <b>{user.username}</b>
                </div>
                <SignOut />
              </div>

              <label className="claim-field">
                <span className="label">{partner.name} username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={MAX_USERNAME_LENGTH}
                  autoComplete="off"
                  required
                  disabled={onCooldown}
                  placeholder="As it appears on your account"
                />
              </label>

              <label className="claim-field">
                <span className="label">Anything else (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_NOTE_LENGTH}
                  rows={3}
                  disabled={onCooldown}
                  placeholder="Period you are claiming for, payment preference…"
                />
              </label>

              <button
                className="btn btn-primary claim-submit"
                type="submit"
                disabled={busy || onCooldown}
              >
                {onCooldown ? `Next Claim In ${countdown(remaining)}` : busy ? 'Sending…' : 'Open A Claim'}
              </button>

              <p className="claim-note">
                Your Discord account and {partner.name} username are sent to the Discord so the
                claim can be checked and paid. Nothing is stored on this site.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function countdown(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function SignOut() {
  return (
    <button
      type="button"
      className="claim-signout"
      onClick={async () => {
        await fetch('/api/auth/discord/logout', { method: 'POST' });
        window.location.reload();
      }}
    >
      Sign out
    </button>
  );
}
