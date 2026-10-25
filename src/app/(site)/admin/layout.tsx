import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';
import { STORE_KIND, storeWritable } from '@/lib/store';

/**
 * The shell every admin route sits in.
 *
 * **This redirect does not protect the pages under it.** Next renders a layout
 * and its page in parallel, so a page that reads data goes on streaming into
 * the response even after this has decided to redirect — measured: a signed-out
 * request to `/admin/giveaway` came back with the raffle entrants' Roobet names
 * in its HTML, next to the redirect instruction. The browser followed the
 * redirect; the data had already been sent.
 *
 * So every admin page calls `assertAdmin()` as its first line, before it reads
 * anything, and every server action does the same. Adding a page here means
 * adding that line. The redirect below only decides where a visitor who should
 * not be here ends up; the per-page and per-action checks are what keep them
 * from seeing anything on the way.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, admin } = await requireAdmin();

  // Not signed in and signed in without access are different problems with
  // different fixes, so they go to different places.
  if (!user) redirect('/api/auth/discord/login?next=/admin');
  if (!admin) redirect('/');

  // Asked once here rather than in each tool: every one of them writes, and
  // every one of them fails the same way. Finding that out by pressing Save
  // and getting a server error is the worst possible time to learn it.
  const writable = await storeWritable();

  return (
    <section className="section wrap">
      <header className="admin-head">
        <h1 className="h-page">Admin</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Signed in as {user?.username}. Everything here is live the moment it is saved.
        </p>
      </header>

      <AdminNav />

      {!writable && (
        <div className="admin-alarm">
          <h2 className="h-section">Nothing here can save</h2>
          <p>
            The store is not writable, so creating a tournament, opening a guess round or linking a
            Roobet account will fail.{' '}
            {STORE_KIND === 'files'
              ? 'It is using local files, which cannot work on Vercel — there is no writable disk. Connect Neon (Postgres) or Upstash (Redis) from the Vercel Marketplace and redeploy; the store switches over on its own once DATABASE_URL, or KV_REST_API_URL and KV_REST_API_TOKEN, are set.'
              : STORE_KIND === 'postgres'
                ? 'It is configured for Postgres but the write was refused — check DATABASE_URL in Vercel, that the Neon database is not suspended, then redeploy.'
                : 'It is configured for Redis but the write was refused — check KV_REST_API_URL and KV_REST_API_TOKEN, then redeploy.'}
          </p>
          <p className="admin-note" style={{ marginTop: 10 }}>
            Reading still works, so everything below shows real data. It is saving that will not.
          </p>
        </div>
      )}

      {children}
    </section>
  );
}
