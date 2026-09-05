import type { IconType } from 'react-icons';
import { FaDiscord, FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiKick } from 'react-icons/si';

import { SOCIALS } from '@/lib/partners';

/**
 * One definition of every social channel, shared by the sidebar and the home
 * page cards. Icons come from react-icons rather than PNG files: they stay
 * sharp at any size, take their colour from CSS, and none of them needed
 * sourcing or keying.
 */
export interface Social {
  key: string;
  name: string;
  href: string;
  /** Verb for the card's button — "Follow" is wrong for Discord and YouTube. */
  action: string;
  /** Full label for the sidebar, where the verb and the platform sit together. */
  cta: string;
  blurb: string;
  Icon: IconType;
  /** The platform's own colour, used on the icon only. */
  brand: string;
}

export const SOCIAL_LINKS: Social[] = [
  {
    key: 'kick',
    name: 'Kick',
    href: SOCIALS.kick,
    action: 'Watch',
    cta: 'Watch on Kick',
    blurb: 'Live streams and giveaways',
    Icon: SiKick,
    brand: '#53fc18',
  },
  {
    key: 'discord',
    name: 'Discord',
    href: SOCIALS.discord,
    action: 'Join',
    cta: 'Join Discord',
    blurb: 'Talk to the rest of the community',
    Icon: FaDiscord,
    brand: '#5865f2',
  },
  {
    key: 'twitch',
    name: 'Twitch',
    href: SOCIALS.twitch,
    action: 'Follow',
    cta: 'Follow on Twitch',
    blurb: 'Catch the streams',
    Icon: FaTwitch,
    brand: '#9146ff',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    href: SOCIALS.youtube,
    action: 'Subscribe',
    cta: 'Subscribe on YouTube',
    blurb: 'Highlights and big wins',
    Icon: FaYoutube,
    brand: '#ff0033',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    href: SOCIALS.tiktok,
    action: 'Follow',
    cta: 'Follow on TikTok',
    blurb: 'Clips from the streams',
    Icon: FaTiktok,
    brand: '#25f4ee',
  },
  {
    key: 'x',
    name: 'X',
    href: SOCIALS.x,
    action: 'Follow',
    cta: 'Follow on X',
    blurb: 'Announcements and results',
    Icon: FaXTwitter,
    brand: '#f2f6fa',
  },
];

/** Grid of social cards for the home page. */
export function SocialCards() {
  return (
    <section className="section wrap">
      <div className="center-head">
        <h2>Follow Misfit Mason</h2>
      </div>

      <div className="social-grid">
        {SOCIAL_LINKS.map(({ key, name, href, action, blurb, Icon, brand }) => (
          <a
            className="social-card"
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ ['--brand' as string]: brand }}
          >
            <span className="social-card-icon">
              <Icon aria-hidden focusable="false" />
            </span>
            <span className="social-card-body">
              <b>{name}</b>
              <span>{blurb}</span>
            </span>
            <span className="social-card-action">{action}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
