import { formatMoney } from '@/lib/format';
import { AFFILIATE_RETURN, FREE_BATTLES, PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import { CopyCode } from './CopyCode';

/** How the affiliate return works, described as a mechanism rather than a claim. */
export function AffiliateRevenue() {
  return (
    <section className="section wrap">
      <div className="section-head">
        <h2 className="h-section">Affiliate revenue</h2>
      </div>

      <div className="grid-2">
        <div>
          <p className="lede">
            Casinos pay affiliates a share of the revenue their referred players generate. On Misfit
            Masons that share is not kept. It is returned {AFFILIATE_RETURN.cadence.toLowerCase()} to
            the players who generated it, claimed on this site.
          </p>
          <p className="lede" style={{ marginTop: 14 }}>
            Leaderboard prizes are funded separately, out of pocket, and are not drawn from affiliate
            revenue.
          </p>
          <p className="pending">Claim flow and payout detail pending</p>
        </div>

        <div className="card">
          <span className="label">Summary</span>
          <div style={{ marginTop: 14 }}>
            <Kv k="Share returned" v={`${AFFILIATE_RETURN.percentage}%`} />
            <Kv k="Cycle" v={AFFILIATE_RETURN.cadence} />
            <Kv k="Method" v={AFFILIATE_RETURN.method} />
            <Kv k="Minimum" v="None" />
            <Kv k="Eligibility" v="Registered under the referral link" />
          </div>
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

export function FreeBattles() {
  const lootbox = PARTNERS[FREE_BATTLES.partnerId];
  return (
    <section className="section wrap" id="battles">
      <div className="section-head">
        <h2 className="h-section">Free battles on {lootbox.name}</h2>
      </div>

      <div className="card">
        <div className="grid-2" style={{ alignItems: 'center' }}>
          <div>
            <p className="lede">
              {FREE_BATTLES.requirement} and you also receive free battle entries, separately from
              the leaderboard and the affiliate return.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <CopyCode code={lootbox.code} />
              <a className="btn btn-primary btn-sm" href={lootbox.signupUrl} target="_blank" rel="noreferrer">
                Open {lootbox.name}
              </a>
            </div>
            {FREE_BATTLES.isPlaceholder && (
              <p className="pending">Entry amounts, cadence and eligibility pending</p>
            )}
          </div>

          <div>
            <Kv k="Partner" v={lootbox.name} />
            <Kv k="Requirement" v="Deposit under the referral link" />
            <Kv k="Reward" v={FREE_BATTLES.reward} />
            <Kv k="Frequency" v={FREE_BATTLES.cadence} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function GettingStarted() {
  return (
    <section className="section wrap">
      <div className="section-head">
        <h2 className="h-section">Getting started</h2>
      </div>
      <div className="grid-3">
        <Step
          n="01"
          title="Create an account"
          body="Sign up through one of the referral links below. Casinos cannot move an existing account to a different affiliate, so this has to be a new account."
        />
        <Step
          n="02"
          title="Play as you normally would"
          body="Everything wagered in the calendar month counts toward the board. There is no minimum, no qualifying period and nothing to opt into."
        />
        <Step
          n="03"
          title="Prizes at month end"
          body="The paying places on each board are settled from that board's prize pool, and affiliate revenue is returned separately on a monthly cycle."
        />
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="step card">
      <div className="step-n">{n}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function Partners() {
  return (
    <section className="section wrap">
      <div className="section-head">
        <h2 className="h-section">Partners</h2>
      </div>
      <div className="grid-2">
        {PARTNER_ORDER.map((id) => {
          const p = PARTNERS[id];
          return (
            <div className="card" key={id}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h3 style={{ fontSize: 18 }}>{p.name}</h3>
                {p.comingSoon && <span className="badge-mock">Coming soon</span>}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '8px 0 16px' }}>{p.blurb}</p>

              <Kv k="Prize pool" v={formatMoney(p.prizePool)} />
              <Kv k="Paid places" v={p.comingSoon ? 'TBA' : `Top ${p.prizeTable.length}`} />
              <Kv k="Split" v={p.comingSoon ? 'TBA' : p.prizeTable.map((x) => `$${x}`).join(' / ')} />
              <Kv k="Referral code" v={p.code} />

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <CopyCode code={p.code} />
                <a className="btn btn-secondary btn-sm" href={p.signupUrl} target="_blank" rel="noreferrer">
                  Open {p.name}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

