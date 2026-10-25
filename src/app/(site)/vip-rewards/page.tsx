import type { Metadata } from 'next';
import Link from 'next/link';

import { Countdown } from '@/components/Countdown';
import { VipClaimButton } from '@/components/VipClaimButton';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { getProfile } from '@/lib/profiles';
import { currentUser } from '@/lib/session';
import { pageMeta } from '@/lib/site';
import {
  VIP_REWARDS,
  VIP_REWARD_TOTAL,
  claimsFor,
  monthOf,
  wagerFor,
  type VipClaim,
} from '@/lib/vip-rewards';

export const metadata: Metadata = pageMeta({
  title: 'VIP Rewards',
  description: `Monthly wager rewards on ${PRIMARY_PARTNER.name}: up to ${formatMoney(VIP_REWARD_TOTAL)} a month across four levels, under code ${PRIMARY_PARTNER.code}.`,
  path: '/vip-rewards',
});

/** Reads the session and a player's live wager, so nothing here is cached. */
export const dynamic = 'force-dynamic';

export default async function VipRewardsPage() {
  const month = monthOf();
  const user = await currentUser();
  const profile = user ? await getProfile(user.id) : undefined;
  const roobet = profile?.roobetUsername || null;

  const [wager, claims] = await Promise.all([
    roobet ? wagerFor(roobet, month) : Promise.resolve(null),
    user ? claimsFor(user.id, month.key) : Promise.resolve([] as VipClaim[]),
  ]);

  const metricWord = VIP_REWARDS.metric === 'weighted' ? 'weighted wager' : 'wager';

  return (
    <>
      <section className="section wrap claim" style={{ paddingBottom: 0 }}>
        <span className="claim-kicker">VIP rewards</span>
        <h1 className="claim-title">
          Monthly <span className="amt">VIP rewards</span>
        </h1>
        <p className="claim-lede">
          Wager under code <b>{PRIMARY_PARTNER.code}</b> on {PRIMARY_PARTNER.name} and every level
          you reach this month pays out — up to {formatMoney(VIP_REWARD_TOTAL)}, on top of the
          leaderboard. Levels stack, and reset at the start of each month.
        </p>

        <div className="vipr-month">
          <span className="label">{month.label} ends in</span>
          <Countdown endsAt={month.end.toISOString()} />
        </div>

        {!user ? (
          <p className="vipr-status">
            <Link className="link" href="/api/auth/discord/login?next=/vip-rewards">
              Sign in with Discord
            </Link>{' '}
            to see your progress.
          </p>
        ) : !roobet ? (
          <p className="vipr-status">
            Signed in as <b>{user.username}</b>.{' '}
            <Link className="link" href="/profile">
              Link your {PRIMARY_PARTNER.name} account
            </Link>{' '}
            to track your progress and claim.
          </p>
        ) : wager === null ? (
          <p className="vipr-status">
            Could not reach {PRIMARY_PARTNER.name} just now — your progress will show again shortly.
          </p>
        ) : (
          <p className="vipr-status">
            <b>{roobet}</b> · {formatMoney(wager)} {metricWord} in {month.label}
          </p>
        )}
      </section>

      <section className="section wrap">
        <div className="vipr-grid">
          {VIP_REWARDS.levels.map((tier) => {
            const current = wager ?? 0;
            const pct = Math.min(100, Math.floor((current / tier.wager) * 100));
            const remaining = Math.max(0, tier.wager - current);
            const reached = wager !== null && current >= tier.wager;
            const claim = claims.find((c) => c.level === tier.level);

            return (
              <article className="vipr-card" key={tier.level} data-reached={reached}>
                <div className="vipr-top">
                  <div>
                    <span className="vipr-kicker">VIP reward</span>
                    <h2>Level {tier.level}</h2>
                  </div>
                  <span className="vipr-chip">+{formatMoney(tier.reward)}</span>
                </div>

                <div className="vipr-figures">
                  <div>
                    {/* "Required", not "Required weighted wager": the long form wraps
                        and pushes the figure out of line with Remaining. The note
                        under the grid says which wager it is. */}
                    <span className="vipr-k">Required</span>
                    <b>{formatMoney(tier.wager)}</b>
                  </div>
                  <div className="vipr-right">
                    <span className="vipr-k">Remaining</span>
                    <b className="vipr-remaining">{formatMoney(roobet ? remaining : tier.wager)}</b>
                  </div>
                </div>

                <div className="vipr-progress">
                  <div className="vipr-progress-head">
                    <span>Progress</span>
                    <span>{roobet ? pct : 0}%</span>
                  </div>
                  <div
                    className="vipr-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={roobet ? pct : 0}
                    aria-label={`Level ${tier.level} progress`}
                  >
                    <span style={{ width: `${roobet ? pct : 0}%` }} />
                  </div>
                </div>

                {!user ? (
                  <Link className="vipr-btn" href="/api/auth/discord/login?next=/vip-rewards">
                    Login To Claim
                  </Link>
                ) : !roobet ? (
                  <Link className="vipr-btn" href="/profile">
                    Link Roobet To Claim
                  </Link>
                ) : claim ? (
                  <span className="vipr-btn vipr-btn-done">
                    {claim.status === 'paid' ? 'Paid' : 'Claimed · In Review'}
                  </span>
                ) : reached ? (
                  <VipClaimButton level={tier.level} />
                ) : (
                  <span className="vipr-btn" aria-disabled>
                    {formatMoney(remaining)} To Go
                  </span>
                )}
              </article>
            );
          })}
        </div>

        <p className="claim-note" style={{ marginTop: 22 }}>
          Measured on {PRIMARY_PARTNER.name}&apos;s {metricWord} for the calendar month in Eastern
          time, the same figure the leaderboard uses. Each level can be claimed once a month per
          account; claims are reviewed against the affiliate statistics before they are paid.
        </p>
      </section>
    </>
  );
}
