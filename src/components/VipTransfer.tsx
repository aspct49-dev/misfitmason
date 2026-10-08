import { cookies } from 'next/headers';

import { PARTNERS, VIP_TRANSFER } from '@/lib/partners';
import { SESSION_COOKIE, readPayload, type SessionUser } from '@/lib/session';
import { VipTransferForm } from './VipTransferForm';

/**
 * VIP transfer.
 *
 * Server half: reads the signed session so a signed-in applicant does not have
 * to type a handle they could get wrong, and so the first render already shows
 * the right state.
 */
export async function VipTransfer() {
  const jar = await cookies();
  const session = readPayload<SessionUser>(jar.get(SESSION_COOKIE)?.value);
  const partner = PARTNERS.roobet;

  return (
    <section className="section wrap" id="vip">
      <div className="section-head">
        <h2 className="h-section">VIP transfer</h2>
      </div>

      <div className="grid-2 claim-grid">
        <div>
          <p className="lede">
            {VIP_TRANSFER.requirement}. {VIP_TRANSFER.reward}.
          </p>

          <div style={{ marginTop: 20 }}>
            <Kv k="Reviewed" v={VIP_TRANSFER.cadence} />
            <Kv k="Decided by" v={partner.name} />
            <Kv k="Costs" v="Nothing" />
          </div>

          <h3 className="vip-subhead">What to send</h3>
          <p className="claim-note" style={{ marginTop: 8, fontSize: 14 }}>
            Screenshots from the casino you play at now: your last 30 days, and your lifetime
            wagered on the same account. Those are what {partner.name} reviews, so make sure the
            figures and the username are both readable.
          </p>

          {VIP_TRANSFER.isPlaceholder && (
            <p className="pending">Exact tiers and amounts are set by {partner.name}, not here</p>
          )}
        </div>

        <div className="card claim-card">
          <VipTransferForm discord={session?.username ?? null} />
        </div>
      </div>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}
