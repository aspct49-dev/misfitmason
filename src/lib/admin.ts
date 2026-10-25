import 'server-only';

import { currentUser, type SessionUser } from './session';

/**
 * Who can run the site.
 *
 * Matched on the Discord account **id**, never the handle: a handle can be
 * changed or released and claimed by somebody else, who would then inherit the
 * panel. The id cannot.
 *
 * The ids come from the environment rather than the source, so the list can be
 * changed on Vercel without a deploy and a fork of the repo does not ship
 * somebody's account as an administrator. With the variable unset, nobody is
 * an admin — the panel fails closed.
 */
function adminIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminId(id?: string | null): boolean {
  return Boolean(id && adminIds().includes(id));
}

/**
 * The session's admin state, resolved on the server.
 *
 * Every admin route and action calls this rather than trusting anything the
 * browser sends. A hidden nav item is a courtesy, not a control.
 */
export async function requireAdmin(): Promise<{ user: SessionUser | null; admin: boolean }> {
  const user = await currentUser();
  return { user, admin: isAdminId(user?.id) };
}

/** Throws unless the caller is an admin. The first line of every server action. */
export async function assertAdmin(): Promise<SessionUser> {
  const { user, admin } = await requireAdmin();
  if (!user || !admin) throw new Error('Forbidden');
  return user;
}
