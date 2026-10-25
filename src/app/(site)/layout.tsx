import type { Metadata } from 'next';

import { Shell } from '@/components/Shell';
import { FONT_VARIABLES } from '@/lib/fonts';
import { SiteFooter } from '@/components/SiteFooter';
import { TOTAL_PRIZE_POOL } from '@/lib/partners';
import { SITE, SOCIAL_PROFILES } from '@/lib/site';
import '../globals.css';
import '../home.css';
import '../leaderboard.css';
import '../ported.css';
import '../tournaments.css';
import '../hunts.css';

export const metadata: Metadata = {
  // Absolute origin for canonicals, Open Graph and the sitemap.
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Bi-weekly wager leaderboards`,
    // Every other page supplies just its own name.
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  creator: SITE.handle,
  publisher: SITE.handle,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: '/',
    title: `${SITE.name} — Bi-weekly wager leaderboards`,
    description: SITE.tagline,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — Bi-weekly wager leaderboards`,
    description: SITE.tagline,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Gambling-adjacent content: state the audience rather than leave it implied.
  other: { rating: 'adult' },
};

/**
 * Organization and WebSite in one graph. Both reference each other by @id, which
 * is what lets a search engine attach the social profiles to the site rather
 * than treating them as two unrelated entities.
 */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/mascot.png`,
        description: SITE.description,
        sameAs: SOCIAL_PROFILES,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        publisher: { '@id': `${SITE.url}/#organization` },
        inLanguage: 'en',
      },
    ],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <body>
        <script
          type="application/ld+json"
          // Serialised from a literal we control, so there is no untrusted input
          // to escape here.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
        <Shell totalPot={TOTAL_PRIZE_POOL}>
          {children}
          <SiteFooter />
        </Shell>
      </body>
    </html>
  );
}
