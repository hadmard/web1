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
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-3">
        <article data-reveal="fade-left" className="glass-panel spotlight-card p-5 lg:col-span-2" data-mouse-zone>
          <div className="showcase-frame media-zoom-smooth mb-4 overflow-hidden rounded-xl border border-border">
            {middleAd.enabled && hasMiddleAdImage ? (
              <Link href={middleAd.href || "/membership"} className="block">
                <Image
                  src={middleAd.imageUrl}
                  alt={middleAd.title}
                  width={1440}
                  height={320}
                  sizes="(max-width: 1024px) 100vw, 760px"
                  className="h-40 w-full object-cover object-[center_42%] sm:h-48"
                />
              </Link>
            ) : hasEnterpriseImage ? (
              <Image
                src={enterpriseImage}
                alt="企业入口栏目封面图"
                width={1600}
                height={900}
                sizes="(max-width: 1024px) 100vw, 760px"
                className="h-40 w-full object-cover object-[center_42%] sm:h-48"
              />
            ) : (
              <div className="h-40 bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated sm:h-48" />
            )}
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[13px] text-muted sm:text-sm">品牌生态</p>
              <h3 className="font-serif text-lg font-semibold text-primary">企业入口</h3>
            </div>
            {middleAd.enabled && middleAd.title ? (
              <Link href={middleAd.href || "/membership"} className="text-sm font-medium text-accent hover:text-primary">
                {middleAd.title}
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enterprises.slice(0, 6).map((enterprise) => (
              <Link
                key={enterprise.id}
                href={`/enterprise/${enterprise.id}`}
                className="interactive-lift spotlight-card block rounded-xl border border-border bg-surface p-3"
                data-mouse-zone
              >
                <p className="text-sm font-medium text-primary">{enterprise.member.name ?? "企业会员"}</p>
                <p className="mt-1 text-[13px] text-muted">{enterprise.area || enterprise.region || "地区信息完善中"}</p>
                <span className="mt-2 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {enterprise.member.memberType === "enterprise_advanced"
                    ? "高级会员"
                    : enterprise.member.memberType === "enterprise_basic"
                      ? "基础会员"
                      : "个人会员"}
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article data-reveal="fade-right" data-reveal-delay="80" className="glass-panel spotlight-card p-5" data-mouse-zone>
          <p className="mb-2 text-[13px] text-muted sm:text-sm">区域热度</p>
          <h3 className="mb-3 font-serif text-lg font-semibold text-primary">品牌数量</h3>
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
