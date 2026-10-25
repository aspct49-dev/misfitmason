import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { assertAdmin } from '@/lib/admin';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { PRIVATE_PAGE } from '@/lib/site';
import { VIP_REWARDS, listClaims, monthOf, setClaimStatus } from '@/lib/vip-rewards';

/**
 * Monthly VIP reward claims, newest first, with the one action that matters:
 * marking a claim paid once the money has gone out.
 *
 * There is nothing to approve. A claim can only be filed once Roobet's own
 * figure clears the level, so by the time it is here the question left is
 * whether it has been paid — and, as with linked accounts, whether the person
 * behind the Discord account is really that Roobet player, which no check can
 * settle and which is what the Discord thread is for.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VIP Rewards',
  ...PRIVATE_PAGE,
};

export default async function AdminVipRewardsPage() {
  await assertAdmin();

  const claims = await listClaims();
  const month = monthOf();
  const thisMonth = claims.filter((c) => c.month === month.key);
  const owed = claims.filter((c) => c.status === 'pending').reduce((s, c) => s + c.reward, 0);

  async function mark(form: FormData) {
    'use server';
    await assertAdmin();
    const status = String(form.get('status')) === 'paid' ? 'paid' : 'pending';
    await setClaimStatus(String(form.get('id')), status);
    revalidatePath('/admin/vip-rewards');
    revalidatePath('/vip-rewards');
  }

  return (
    <>
      <h2 className="admin-group">VIP rewards</h2>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">
            Claims <span className="admin-count">{claims.length}</span>
          </h2>
          <span className="give-conn" data-on={owed === 0}>
            {owed === 0 ? 'Nothing owed' : `${formatMoney(owed)} to pay out`}
          </span>
        </div>

        <p className="admin-note" style={{ marginBottom: 14 }}>
          {month.label}: {thisMonth.length} claim{thisMonth.length === 1 ? '' : 's'} so far. Levels
          are {VIP_REWARDS.levels.map((l) => `${formatMoney(l.wager)} → ${formatMoney(l.reward)}`).join(' · ')},
          on {VIP_REWARDS.metric} wager.
        </p>

        {claims.length === 0 ? (
          <p className="admin-note">
            No claims yet. They appear here, and in the claims channel, the moment a player clears a
            level and presses Claim.
          </p>
        ) : (
          <div className="admin-list">
            {claims.map((c) => (
              <div className="admin-bonus" key={c.id}>
                <span className="admin-bonus-game">
                  Level {c.level} · {formatMoney(c.reward)}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--dim)' }}>
                    {c.month} · {c.discordName}
                  </span>
                </span>

                <span className="admin-bonus-bet">
                  {PRIMARY_PARTNER.name}: <b>{c.roobet}</b>
                </span>

                <span className="admin-bonus-bet">
                  {formatMoney(c.wager)} {VIP_REWARDS.metric === 'weighted' ? 'weighted' : 'wagered'}
                </span>

                <span className="admin-bonus-bet" style={{ color: 'var(--dim)' }}>
                  {new Date(c.at).toLocaleDateString('en-GB')}
                </span>

                <form action={mark}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value={c.status === 'paid' ? 'pending' : 'paid'} />
                  <button
                    className="btn btn-sm"
                    data-paid={c.status === 'paid'}
                    style={
                      c.status === 'paid'
                        ? { borderColor: 'var(--live)', color: 'var(--live)', background: 'none' }
                        : undefined
                    }
                    type="submit"
                  >
                    {c.status === 'paid' ? 'Paid ✓' : 'Mark Paid'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
