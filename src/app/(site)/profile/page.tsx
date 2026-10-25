import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { PageBanner } from '@/components/PageBanner';
import { ExternalIcon } from '@/components/icons';
import { SESSION_COOKIE, currentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { PRIVATE_PAGE } from '@/lib/site';
import { getProfile, linkRoobet, unlinkKick, unlinkRoobet } from '@/lib/profiles';
import { kickOAuthConfigured } from '@/lib/kick-oauth';
import { checkRoobet } from '@/lib/roster';
import { isAdminId } from '@/lib/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Account',
  ...PRIVATE_PAGE,
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/api/auth/discord/login?next=/profile');

  const discordId = user.id;
  const [profile, params] = await Promise.all([getProfile(discordId), searchParams]);

  // Only checked when there is something to check — an unlinked account should
  // not cost a call to Roobet on every page load.
  const check = profile ? await checkRoobet(profile.roobetUsername) : null;

  async function link(form: FormData) {
    'use server';
    const s = await currentUser();
    if (!s) return;
    const result = await linkRoobet(s.id, String(form.get('roobet') ?? ''));
    revalidatePath('/profile');
    if (!result.ok) redirect(`/profile?error=${encodeURIComponent(result.error)}`);
  }

  async function unlink() {
    'use server';
    const s = await currentUser();
    if (!s) return;
    await unlinkRoobet(s.id);
    revalidatePath('/profile');
  }

  async function signOut() {
    'use server';
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    redirect('/');
  }

  async function disconnectKick() {
    'use server';
    const s = await currentUser();
    if (!s) return;
    await unlinkKick(s.id);
    revalidatePath('/profile');
  }

  return (
    <>
      <PageBanner title="My Account" />

      <section className="section wrap">
        <div className="acct-grid">
          <article className="acct-card">
            <h2 className="h-section">Discord</h2>
            <div className="acct-who">
              <span className="acct-avatar">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
                  <img src={user.avatarUrl} alt="" width={44} height={44} />
                ) : (
                  <span className="account-initial">
                    {(user.username ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div>
                <b>{user.username}</b>
                <span className="acct-sub">Signed in</span>
              </div>
            </div>
          </article>

          <article className="acct-card">
            <h2 className="h-section">{PRIMARY_PARTNER.name} account</h2>

            {profile ? (
              <>
                <div className="acct-linked" data-ok={check?.found}>
                  <b>{profile.roobetUsername}</b>
                  {check?.error ? (
                    <span className="acct-state acct-warn">
                      Could not check right now — {check.error}
                    </span>
                  ) : check?.found ? (
                    <span className="acct-state acct-ok">
                      Under code {PRIMARY_PARTNER.code} ·{' '}
                      {formatMoney(check.player?.weightedWagered ?? 0)} weighted, all-time
                    </span>
                  ) : (
                    <span className="acct-state acct-warn">
                      Not showing under the code yet
                    </span>
                  )}
                </div>

                {!check?.found && !check?.error && (
                  <p className="acct-note">
                    {PRIMARY_PARTNER.name} only lists players who have placed a bet. If you have
                    just signed up under <b>{PRIMARY_PARTNER.code}</b>, play a hand and check back
                    — it is not a spelling problem.
                  </p>
                )}

                <form action={unlink} style={{ marginTop: 16 }}>
                  <button className="btn btn-quiet btn-sm" type="submit">
                    Unlink
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="acct-note">
                  Link the {PRIMARY_PARTNER.name} username you play under so raffles and rank
                  rewards know who you are. It has to be an account registered under code{' '}
                  <b>{PRIMARY_PARTNER.code}</b>.
                </p>

                {params.error && (
                  <p className="notice" style={{ marginTop: 14 }}>
                    <span className="notice-mark" aria-hidden>
                      !
                    </span>
                    {params.error}
                  </p>
                )}

                <form action={link} className="admin-form" style={{ marginTop: 6 }}>
                  <label className="field">
                    <span>{PRIMARY_PARTNER.name} username</span>
                    <input name="roobet" placeholder="yourname" required autoComplete="off" />
                  </label>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Link Account
                  </button>
                </form>

                <a
                  className="acct-link"
                  href={PRIMARY_PARTNER.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  No account yet? Sign up under the code
                  <ExternalIcon />
                </a>
              </>
            )}
          </article>

          {/*
           * Kick, linked through Kick's own login rather than typed.
           *
           * Only chat raffles read it — an entry arrives carrying a Kick
           * identity and nothing else — so this is its own card rather than a
           * field on the Roobet one, and nothing here blocks the leaderboard
           * or rank rewards.
           */}
          <article className="acct-card">
            <h2 className="h-section">Kick account</h2>

            {profile?.kickUsername ? (
              <>
                <div className="acct-linked" data-ok>
                  <b>{profile.kickUsername}</b>
                  <span className="acct-state acct-ok">Connected — raffles can match you in chat</span>
                </div>
                <form action={disconnectKick} style={{ marginTop: 16 }}>
                  <button className="btn btn-quiet btn-sm" type="submit">
                    Disconnect
                  </button>
                </form>
              </>
            ) : kickOAuthConfigured ? (
              <>
                <p className="acct-note">
                  Connect Kick if you want to enter raffles by typing in chat. We only ask Kick for
                  your username — nothing else — and it is how a message in chat is matched to your{' '}
                  {PRIMARY_PARTNER.name} account. Everything else on the site works without it.
                </p>
                <a className="btn btn-primary btn-sm" href="/api/kick/start" style={{ marginTop: 14 }}>
                  Connect Kick Account
                </a>
              </>
            ) : (
              <p className="acct-note">Kick linking is not switched on for this site yet.</p>
            )}
          </article>

          {/* The only way into the panel from the site: the sidebar is not
              session-aware, so admins find it here rather than in the nav. */}
          {isAdminId(user.id) && (
            <article className="acct-card">
              <h2 className="h-section">Admin</h2>
              <p className="acct-note">
                Run raffles, guess-the-balance rounds and tournaments, pay out VIP rewards, and grab
                the stream overlay links.
              </p>
              <Link className="btn btn-primary btn-sm" href="/admin" style={{ marginTop: 14 }}>
                Open Admin Panel
              </Link>
            </article>
          )}

          <article className="acct-card">
            <h2 className="h-section">Session</h2>
            <p className="acct-note">Signed in with Discord as {user.username}.</p>
            <form action={signOut} style={{ marginTop: 14 }}>
              <button className="btn btn-quiet btn-sm" type="submit">
                Sign Out
              </button>
            </form>
          </article>
        </div>
      </section>
    </>
  );
}
