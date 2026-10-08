'use client';

import { useState } from 'react';

import { PARTNERS, VIP_TRANSFER } from '@/lib/partners';
import {
  LOSSBACK_OPTIONS,
  MAX_FILES,
  MAX_GAMES_LENGTH,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_TOTAL_BYTES,
} from '@/lib/vip.shared';

/**
 * Applying to have a VIP level matched.
 *
 * Open to people who are not signed in, deliberately: someone arriving from a
 * stream with a level elsewhere is exactly who this is for, and an account is a
 * step between them and the thing they came to do. Signing in only saves
 * typing — and gives a handle they cannot mistype.
 *
 * Nothing here is stored. The screenshots go straight to Discord as
 * attachments and the request ends.
 */
export function VipTransferForm({ discord }: { discord: string | null }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner = PARTNERS.roobet;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);

    // Checked here as well so the applicant is not made to upload twenty
    // megabytes before being told it was too much.
    const files = [...form.getAll('recent'), ...form.getAll('lifetime')].filter(
      (f): f is File => f instanceof File && f.size > 0,
    );
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(
        `That is ${(total / 1024 / 1024).toFixed(0)}MB of screenshots. Keep it under ${
          MAX_TOTAL_BYTES / 1024 / 1024
        }MB in total.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/vip-transfer', { method: 'POST', body: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Could not send that application. Try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="claim-done">
        <span className="label">Application sent</span>
        <p>
          It is in the Discord for review. {partner.name} decides the tier, not us, so the reply
          comes once they have looked at your figures.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <p className="claim-error" role="alert">
          {error}
        </p>
      )}

      {/* Honeypot: hidden from people, irresistible to scripts. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="vip-trap"
      />

      <label className="claim-field">
        <span className="label">{partner.name} username</span>
        <input name="username" maxLength={MAX_NAME_LENGTH} autoComplete="off" required
          placeholder="The account you play under the code on" />
      </label>

      {discord ? (
        <div className="claim-field">
          <span className="label">Discord</span>
          <p className="vip-prefilled">
            <b>{discord}</b> — taken from your sign-in, so the reply reaches you.
          </p>
        </div>
      ) : (
        <label className="claim-field">
          <span className="label">Discord handle</span>
          <input name="discord" maxLength={MAX_NAME_LENGTH} autoComplete="off" required
            placeholder="username, not a nickname" />
        </label>
      )}

      <div className="vip-row">
        <label className="claim-field">
          <span className="label">VIP at</span>
          <input name="currentCasino" maxLength={MAX_NAME_LENGTH} autoComplete="off" required
            placeholder="The casino you play now" />
        </label>

        <label className="claim-field">
          <span className="label">Current lossback</span>
          <select name="lossback" defaultValue="" required>
            <option value="" disabled>
              Choose
            </option>
            {LOSSBACK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="claim-field">
        <span className="label">What you mostly play</span>
        <input name="games" maxLength={MAX_GAMES_LENGTH} autoComplete="off" required
          placeholder="Slots, crash, table games…" />
      </label>

      <label className="claim-field">
        <span className="label">Last 30 days (screenshot)</span>
        <input type="file" name="recent" accept="image/jpeg,image/png,image/webp" multiple required />
      </label>

      <label className="claim-field">
        <span className="label">Lifetime wagered (screenshot)</span>
        <input type="file" name="lifetime" accept="image/jpeg,image/png,image/webp" multiple required />
      </label>

      <label className="claim-field">
        <span className="label">Anything else (optional)</span>
        <textarea name="notes" maxLength={MAX_NOTES_LENGTH} rows={3}
          placeholder="Current tier, how long you have played there…" />
      </label>

      <button className="btn btn-primary claim-submit" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Apply For A Transfer'}
      </button>

      <p className="claim-note">
        Up to {MAX_FILES} images per section, {MAX_TOTAL_BYTES / 1024 / 1024}MB in total. JPG, PNG
        or WEBP. Applications go straight to the Discord review channel — nothing you send is kept
        on this site. {VIP_TRANSFER.isPlaceholder && `Tiers are set by ${partner.name}, not here.`}
      </p>
    </form>
  );
}
