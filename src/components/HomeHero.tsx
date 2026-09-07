import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { AFFILIATE_RETURN, PARTNERS, TOTAL_PRIZE_POOL } from '@/lib/partners';

/**
 * The lodge, in four depth planes:
 *
 *   1. the room, drifting slowly
 *   2. the wordmark, sitting inside the dark opening of the arch
 *   3. the mascot, large, standing in front of the wordmark
 *   4. the table, cropping him at the chest
 *
 * The call to action sits in front of the table, on the felt, so the mascot has
 * the whole middle of the frame to himself.
 */

/** [sprite, left %, width px, rise seconds, delay seconds, sway seconds] */
type Prop = [string, number, number, number, number, number];

// Fixed array rather than random: the server and the client must render the
// same positions or React throws a hydration mismatch.
const PROPS: Prop[] = [
  ['card', 11, 84, 21, 4, 5.6],
  ['dice', 83, 92, 24, 10, 6.2],
  ['hat', 93, 100, 19, 15, 5.1],
  ['chip', 4, 76, 23, 1, 6.6],
  ['keystone', 70, 68, 27, 13, 7.2],
];

function PropLayer({ items }: { items: Prop[] }) {
  return (
    <div className="prop-layer props-front" aria-hidden>
      {items.map(([sprite, left, width, rise, delay, sway], i) => (
        <span
          key={`${sprite}-${i}`}
          className="prop"
          style={{
            left: `${left}%`,
            width: `${width}px`,
            animationDuration: `${rise}s`,
            animationDelay: `${delay}s`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative sprite */}
          <img
            src={`/prop-${sprite}.webp`}
            alt=""
            /* display:none does not stop a download, but lazy does: a hidden
               element never nears the viewport. Saves the phone five sprites
               it will never show, and costs desktop nothing since they start
               on screen. */
            loading="lazy"
            decoding="async"
            style={{ animationDuration: `${sway}s` }}
          />
        </span>
      ))}
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="hero-lodge" aria-hidden />
      <div className="hero-light" aria-hidden />
      <div className="hero-vignette" aria-hidden />

      <div className="home-hero-inner">
        <span className="hero-kicker">
          <span className="dot" />
          Shuffle &amp; Lootbox partner
        </span>

        {/*
          PLACEHOLDER wordmark, set in type until the generated artwork lands.
          It stays an <h1> either way — when the art replaces it, the text moves
          to the image's alt so the page keeps a real heading.
        */}
        <h1 className="hero-wordmark">
          <span>Misfit</span>
          <span>Mason</span>
        </h1>
      </div>

      {/* A CSS background rather than an <img>: the phone layout hides the
          mascot, and browsers fetch a hidden <img> anyway — even with
          loading="lazy" — while a background on a display:none element is never
          requested. Purely decorative, so nothing semantic is lost. */}
      <div className="hero-mascot" aria-hidden>
        <span className="hero-mascot-art" />
      </div>

      <PropLayer items={PROPS} />

      {/* In front of the mascot, so he reads as standing behind the table. */}
      <div className="hero-table" aria-hidden />

      {/* In front of the table, on the felt. */}
      <div className="hero-cta">
        {/* Kept to one line at this width: two lines reach up past the felt and
            land on the mascot's shoulders. */}
        <p className="hero-tagline">
          {formatMoney(TOTAL_PRIZE_POOL)} in monthly prizes, and {AFFILIATE_RETURN.percentage}% of
          affiliate revenue returned to players.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/leaderboards">
            View leaderboards
          </Link>
          <a
            className="btn btn-secondary"
            href={PARTNERS.shuffle.signupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Play on Shuffle
          </a>
        </div>
      </div>
    </section>
  );
}
