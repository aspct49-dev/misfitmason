import { DM_Sans, JetBrains_Mono } from 'next/font/google';

/**
 * The two faces, shared by both root layouts.
 *
 * One sans for everything, one mono for every number and label. Two families
 * is the whole type system — display faces were what made the first pass
 * shout. Defined once here because the site and the stream overlays are two
 * root layouts, and a second copy of the font setup would be a second thing to
 * keep in step.
 */
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

export const FONT_VARIABLES = `${sans.variable} ${mono.variable}`;
