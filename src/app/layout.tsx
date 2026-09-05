import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';

import { Shell } from '@/components/Shell';
import { SiteFooter } from '@/components/SiteFooter';
import { TOTAL_PRIZE_POOL } from '@/lib/partners';
import './globals.css';
import './home.css';
import './leaderboard.css';

/* One sans for everything, one mono for every number and label. Two families is
   the whole type system — display faces were what made the first pass shout. */
const sans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-mono-stack',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Misfit Mason — Monthly wager leaderboards',
  description:
    'Monthly Roobet and Lootbox wager leaderboards for the community. All affiliate revenue is returned to players.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Shell totalPot={TOTAL_PRIZE_POOL}>
          {children}
          <SiteFooter />
        </Shell>
      </body>
    </html>
  );
}
