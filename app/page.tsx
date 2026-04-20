import type { Metadata } from "next";
import { HomeBrandEntrySection } from "@/components/homepage/HomeBrandEntrySection";
import { HomeHeroSection } from "@/components/homepage/HomeHeroSection";
import { HomeHuadianSection } from "@/components/homepage/HomeHuadianSection";
import { HomeJoinSection } from "@/components/homepage/HomeJoinSection";
import { HomeStructureSection } from "@/components/homepage/HomeStructureSection";
import { HomeUpdatesSection } from "@/components/homepage/HomeUpdatesSection";
import { ScrollMotion } from "@/components/ScrollMotion";
import { getHomepageData } from "@/lib/homepage-data";
import { SITE_DESCRIPTION, SITE_TITLE, buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = buildPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: ["整木网", "整木资讯", "整木标准", "整木市场", "整木词库", "整木评选", "整木优选"],
});

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
      <HomeBrandEntrySection
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
