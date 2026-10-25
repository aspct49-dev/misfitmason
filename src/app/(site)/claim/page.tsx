import type { Metadata } from 'next';

import { ClaimBack } from '@/components/ClaimBack';
import { AFFILIATE_RETURN, PARTNERS } from '@/lib/partners';

const description = `Claim your share of the affiliate revenue. ${AFFILIATE_RETURN.percentage}% of what your play generates goes back to you — sign in with Discord and send your ${PARTNERS.roobet.name} username.`;

export const metadata: Metadata = {
  title: 'Claim',
  description,
  alternates: { canonical: '/claim' },
  openGraph: { title: 'Claim', description, url: '/claim' },
};

/**
 * Its own page, like the VIP transfer: it is a thing people are sent a link to
 * and arrive at with intent, and it reads the session to decide what to render,
 * so there is nothing here worth caching.
 */
export const dynamic = 'force-dynamic';

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const { login } = await searchParams;
  return <ClaimBack loginError={login} />;
}
