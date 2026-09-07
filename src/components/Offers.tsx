import { formatMoney } from '@/lib/format';
import { FREE_BATTLES, PARTNERS, PARTNER_ORDER } from '@/lib/partners';
import { CopyCode } from './CopyCode';

/**
 * Partner offer cards — the "bonuses" row every site in this category runs
 * directly under the hero. One card per casino: what it is, the code, the terms
 * as a short table, and the way in.
 */
export function Offers() {
  return (
    <section className="section wrap" id="offers">
      <div className="center-head">
        <h2>Bonuses</h2>
        <p>
          Register under code <b>{PARTNERS.shuffle.code}</b> to join the boards
        </p>
      </div>

      <div className="offer-grid">
        {PARTNER_ORDER.map((id) => {
          const p = PARTNERS[id];
          const logo = p.logo;
          const battles = FREE_BATTLES.partnerId === id;

          return (
            <article className="offer" key={id}>
              <div className="offer-head">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- partner brand asset
                  <img className="offer-logo" src={logo} alt={p.name} />
                ) : (
                  <span className="offer-name">{p.name}</span>
                )}
                {p.comingSoon && <span className="badge-mock">Coming soon</span>}
              </div>

              <p className="offer-code">
                Use code <b>{p.code}</b> — {p.blurb}
              </p>

              <ul className="offer-rows">
                <li>
                  <span>Monthly prize pool</span>
                  <b>{formatMoney(p.prizePool)}</b>
                </li>
                <li>
                  <span>Paid places</span>
                  <b>{p.comingSoon ? 'TBA' : `Top ${p.prizeTable.length}`}</b>
                </li>
                <li>
                  <span>Split</span>
                  <b>{p.comingSoon ? 'TBA' : p.prizeTable.map((x) => `$${x}`).join(' / ')}</b>
                </li>
                <li>
                  <span>Minimum to qualify</span>
                  <b>None</b>
                </li>
                {battles && (
                  <li>
                    <span>Depositor extra</span>
                    <b>Free battles</b>
                  </li>
                )}
              </ul>

              <div className="offer-foot">
                <a className="btn btn-primary" href={p.signupUrl} target="_blank" rel="noreferrer">
                  Play {p.name}
                </a>
                <CopyCode code={p.code} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
