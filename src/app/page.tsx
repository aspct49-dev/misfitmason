import { HomeHero } from '@/components/HomeHero';
import { Offers } from '@/components/Offers';
import { PromoBoard } from '@/components/PromoBoard';
import { Tiles } from '@/components/Tiles';
import { BrandStrips } from '@/components/BrandStrips';
import { SocialCards } from '@/components/socials';
import { Reveal } from '@/components/Reveal';
import { getAllLeaderboards } from '@/lib/services/leaderboard';
import { PARTNERS } from '@/lib/partners';

// Standings are the reason people return; a minute of cache is plenty.
export const revalidate = 60;

export default async function HomePage() {
  const boards = await getAllLeaderboards();

  return (
    <>
      <HomeHero />

      <Reveal>
        <BrandStrips />
      </Reveal>

      <Reveal>
        <Offers />
      </Reveal>

      {/* The Roobet board is the live one, so it is the one previewed here. The
          full table for both partners lives on /leaderboards. */}
      <Reveal>
        <PromoBoard board={boards.roobet} partner={PARTNERS.roobet} />
      </Reveal>

      <Reveal>
        <Tiles />
      </Reveal>

      <Reveal>
        <SocialCards />
      </Reveal>
    </>
  );
}
