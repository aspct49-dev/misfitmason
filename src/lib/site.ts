import { SOCIALS } from './partners';

/**
 * Canonical site identity. Everything SEO-facing reads from here so the domain,
 * the name and the description are stated once.
 *
 * The URL comes from the environment because canonical tags, the sitemap and
 * Open Graph images all need an absolute origin, and it differs between local,
 * preview and production. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on every
 * deploy, so production works with no configuration; set NEXT_PUBLIC_SITE_URL
 * once a custom domain is attached.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export const SITE = {
  name: 'Misfit Mason',
  /** Used where the streamer rather than the site is meant. */
  handle: 'MisfitMason',
  url: resolveSiteUrl(),
  description:
    'Monthly Shuffle and Lootbox wager leaderboards. Play under the Misfit Mason code, climb the board, and get 100% of the affiliate revenue returned to players.',
  /** Short form for Open Graph, where long descriptions get truncated. */
  tagline: 'Monthly wager leaderboards. 100% of affiliate revenue returned to players.',
  locale: 'en_GB',
} as const;

/** Every page, in the order they appear in the nav. Drives the sitemap. */
export const ROUTES = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/leaderboards', priority: 0.9, changeFrequency: 'hourly' as const },
  { path: '/rewards', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' as const },
];

export const SOCIAL_PROFILES = [
  SOCIALS.kick,
  SOCIALS.twitch,
  SOCIALS.youtube,
  SOCIALS.tiktok,
  SOCIALS.x,
];
