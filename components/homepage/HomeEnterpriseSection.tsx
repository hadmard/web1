import Image from "next/image";
import Link from "next/link";

type EnterpriseItem = {
  id: string;
  region: string | null;
  area: string | null;
  member: {
    name: string | null;
    memberType: string;
  };
};

type RegionCount = {
  region: string;
  count: number;
};

export function HomeEnterpriseSection({
  middleAd,
  enterpriseImage,
  enterprises,
  regionCounts,
}: {
  middleAd: { enabled: boolean; title: string; imageUrl: string; href: string };
  enterpriseImage: string;
  enterprises: EnterpriseItem[];
  regionCounts: RegionCount[];
}) {
  const hasMiddleAdImage = middleAd.imageUrl.trim().length > 0;
  const hasEnterpriseImage = enterpriseImage.trim().length > 0;

  return (
    <section className="section-tone-c border-b border-border py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-4">
        <article data-reveal="fade-left" className="glass-panel spotlight-card p-5 lg:col-span-2" data-mouse-zone>
          {middleAd.enabled && hasMiddleAdImage ? (
            <Link href={middleAd.href || "/membership"} className="block">
              <div className="showcase-frame media-zoom-smooth mb-3 overflow-hidden rounded-xl border border-border">
                <Image
                  src={middleAd.imageUrl}
                  alt={middleAd.title}
                  width={1440}
                  height={320}
                  sizes="(max-width: 1024px) 100vw, 760px"
                  className="h-40 w-full object-cover object-[center_42%] sm:h-48"
                />
              </div>
              <p className="text-sm font-medium text-primary">{middleAd.title}</p>
            </Link>
          ) : (
            <div>
              <div className="showcase-frame media-zoom-smooth mb-4 overflow-hidden rounded-xl border border-border">
                {hasEnterpriseImage ? (
                  <Image
                    src={enterpriseImage}
                    alt=""
                    width={1600}
                    height={900}
                    sizes="(max-width: 1024px) 100vw, 760px"
                    className="h-40 w-full object-cover object-[center_42%] sm:h-48"
                  />
                ) : (
                  <div className="h-40 sm:h-48 bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated" />
                )}
              </div>
              <p className="text-[13px] sm:text-sm text-muted mb-2">品牌生态</p>
              <h3 className="font-serif text-lg font-semibold text-primary mb-3">企业入口</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {enterprises.slice(0, 6).map((enterprise) => (
                  <Link key={enterprise.id} href={`/enterprise/${enterprise.id}`} className="interactive-lift spotlight-card rounded-xl border border-border bg-surface p-3 block" data-mouse-zone>
                    <p className="text-sm font-medium text-primary">{enterprise.member.name ?? "企业会员"}</p>
                    <p className="text-[13px] text-muted mt-1">{enterprise.area || enterprise.region || "地区信息完善中"}</p>
                    <span className="mt-2 inline-block text-xs rounded-full px-2 py-0.5 border border-border text-muted">
                      {enterprise.member.memberType === "enterprise_advanced"
                        ? "高级会员"
                        : enterprise.member.memberType === "enterprise_basic"
                          ? "基础会员"
                          : "个人会员"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        <article data-reveal="fade-right" data-reveal-delay="80" className="glass-panel spotlight-card p-5" data-mouse-zone>
          <p className="text-[13px] sm:text-sm text-muted mb-2">区域热度</p>
          <h3 className="font-serif text-lg font-semibold text-primary mb-3">品牌数量</h3>
          <ul className="list-cascade space-y-2 text-sm">
            {regionCounts.map((region) => (
              <li key={region.region} className="flex items-center justify-between">
                <Link href={`/brands/all?region=${encodeURIComponent(region.region)}`} className="text-primary hover:text-accent">
                  {region.region}
                </Link>
                <span className="text-muted">{region.count}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
