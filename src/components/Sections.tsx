import { formatMoney } from '@/lib/format';
import { PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import { CopyCode } from './CopyCode';

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <b>{v}</b>
    </div>
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
          body="Everything wagered inside the current period counts toward the board. There is no minimum, no qualifying period and nothing to opt into."
        />
        <Step
          n="03"
          title="Prizes at period end"
          body="The paying places, the raffle and any milestones you reached are settled when the period closes, and announced in the Discord."
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

