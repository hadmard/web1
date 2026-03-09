import { HomeEnterpriseSection } from "@/components/homepage/HomeEnterpriseSection";
import { HomeHeroSection } from "@/components/homepage/HomeHeroSection";
import { HomeHuadianSection } from "@/components/homepage/HomeHuadianSection";
import { HomeJoinSection } from "@/components/homepage/HomeJoinSection";
import { HomeStructureSection } from "@/components/homepage/HomeStructureSection";
import { HomeUpdatesSection } from "@/components/homepage/HomeUpdatesSection";
import { ScrollMotion } from "@/components/ScrollMotion";
import { getHomepageData } from "@/lib/homepage-data";

export const revalidate = 300;

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main className="min-h-screen">
      <ScrollMotion />
      <HomeHeroSection heroBackground={data.visualSettings.backgrounds.homeHero} />
      <HomeUpdatesSection
        bannerSrc={data.visualSettings.backgrounds.homeUpdates}
        latestNews={data.latestNews}
        hotNews={data.hotNews}
      />
      <HomeStructureSection cards={data.structureCards} />
      <HomeEnterpriseSection
        middleAd={data.middleAd}
        enterpriseImage={data.visualSettings.backgrounds.homeEnterprise}
        enterprises={data.enterprises}
        regionCounts={data.regionCounts}
      />
      <HomeHuadianSection
        image={data.visualSettings.backgrounds.homeHuadian}
        year={data.huadianYear}
        top10={data.huadianTop10}
        partner={data.huadianPartner}
      />
      <HomeJoinSection />
    </main>
  );
}
