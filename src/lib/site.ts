import type { Metadata } from 'next';

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
    '$950 in potential monthly rewards on Roobet under code MisfitMason: a $750 bi-weekly wager leaderboard, $250 in monthly wager milestones, a $100 bi-weekly raffle and a first-time deposit bonus.',
  /** Short form for Open Graph, where long descriptions get truncated. */
  tagline: '$950 in potential monthly rewards under code MisfitMason.',
  locale: 'en_GB',
} as const;

/** Every page, in the order they appear in the nav. Drives the sitemap. */
export const ROUTES = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/leaderboards', priority: 0.9, changeFrequency: 'hourly' as const },
  { path: '/rewards', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/challenges', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/vip-rewards', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/tournaments', priority: 0.7, changeFrequency: 'daily' as const },
  { path: '/guess-the-balance', priority: 0.7, changeFrequency: 'daily' as const },
  { path: '/raffle', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/vip-transfer', priority: 0.6, changeFrequency: 'monthly' as const },
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

/** Pages that exist for signed-in people or admins and have no business in search. */
export const PRIVATE_PAGE: Metadata = {
  robots: { index: false, follow: false },
};

/** Per-page metadata with the canonical and Open Graph fields filled in alike. */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}
