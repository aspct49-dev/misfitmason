import type { Metadata } from 'next';

import { VipTransfer } from '@/components/VipTransfer';
import { PARTNERS } from '@/lib/partners';

const description = `Already a VIP somewhere else? Apply to have your level matched on ${PARTNERS.roobet.name} under code ${PARTNERS.roobet.code}. Send your figures, a person reviews it, it costs nothing.`;

export const metadata: Metadata = {
  title: 'VIP Transfer',
  description,
  alternates: { canonical: '/vip-transfer' },
  openGraph: { title: 'VIP Transfer', description, url: '/vip-transfer' },
};

/**
 * Its own page rather than a section of /rewards.
 *
 * It is the one thing on the site a player arrives at with intent — sent a
 * link, usually, from a stream or the Discord — and a link into the middle of
 * a long page is a worse answer than a page of its own. It also reads the
 * session to prefill, so there is nothing here worth caching.
 */
export const dynamic = 'force-dynamic';

export default function VipTransferPage() {
  return (
    <>
      <section className="section wrap" style={{ paddingTop: 40, paddingBottom: 0 }}>
        <div className="section-head">
          <h1 className="h-page">VIP transfer</h1>
        </div>
      </section>

      <VipTransfer showHeading={false} />
    </>
  );
}
