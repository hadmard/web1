import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

function parseCsv(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: { member: { select: { name: true } } },
  });
  if (!ent) return { title: "企业展示" };

  const name = ent.companyShortName || ent.companyName || ent.member?.name || "企业";
  return {
    title: `${name} | 企业展示 | 整木网`,
    description: ent.positioning ?? ent.intro ?? "企业结构化展示页",
  };
}

export default async function EnterprisePage({ params }: Props) {
  const { id } = await params;

  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  });

  if (!ent || !ent.member) notFound();

  const memberId = ent.member.id;
  const standardIds = parseCsv(ent.relatedStandards);

  const [articles, gallery, standards] = await Promise.all([
    prisma.article.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: articleOrderByPinnedLatest,
      take: 20,
      select: { id: true, title: true, slug: true, createdAt: true },
    }),
    prisma.galleryImage.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, title: true, imageUrl: true, createdAt: true },
    }),
    standardIds.length
      ? prisma.standard.findMany({
          where: { id: { in: standardIds } },
          select: { id: true, title: true, code: true, year: true },
        })
      : Promise.resolve([]),
  ]);

  const name = ent.companyShortName || ent.companyName || ent.member.name || "企业";

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{name}</span>
      </nav>

      <section className="rounded-xl border border-border p-6 bg-surface-elevated">
        <h1 className="font-serif text-2xl font-bold text-primary mb-2">{name}</h1>
        <p className="text-sm text-muted mb-4">
          会员类型：{ent.member.memberType} · 权重：{ent.member.rankingWeight}
        </p>
        {ent.verificationStatus && (
          <p className="text-xs text-muted mb-4">
            认证状态：{ent.verificationStatus === "approved" ? "已认证" : ent.verificationStatus}
            {ent.verifiedAt ? ` · 审核时间：${new Date(ent.verifiedAt).toLocaleDateString("zh-CN")}` : ""}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {ent.companyName && <Field label="企业全称" value={ent.companyName} />}
          {ent.companyShortName && <Field label="企业简称" value={ent.companyShortName} />}
          {ent.contactPerson && <Field label="联系人" value={ent.contactPerson} />}
          {ent.intro && <Field label="企业介绍" value={ent.intro} />}
          {ent.positioning && <Field label="企业定位" value={ent.positioning} />}
          {ent.productSystem && <Field label="产品体系" value={ent.productSystem} />}
          {ent.craftLevel && <Field label="工艺等级" value={ent.craftLevel} />}
          {ent.region && <Field label="所属区域" value={ent.region} />}
          {ent.area && <Field label="省区分布" value={ent.area} />}
          {ent.certifications && <Field label="认证情况" value={ent.certifications} />}
          {ent.licenseCode && <Field label="统一社会信用代码" value={ent.licenseCode} />}
          {ent.address && <Field label="企业地址" value={ent.address} />}
          {ent.website && <Field label="企业官网" value={ent.website} />}
          {ent.foundedAt && <Field label="成立时间" value={ent.foundedAt} />}
          {ent.registeredCapital && <Field label="注册资本" value={ent.registeredCapital} />}
          {ent.awards && <Field label="获奖记录" value={ent.awards} />}
          {ent.contactInfo && <Field label="联系方式" value={ent.contactInfo} />}
          {ent.contactPhone && <Field label="联系电话" value={ent.contactPhone} />}
          {ent.videoUrl && <Field label="企业视频" value={ent.videoUrl} />}
        </div>
      </section>

      <section className="rounded-xl border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-primary mb-3">企业资讯</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-muted">暂无已审核资讯</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((article) => (
              <li key={article.id} className="text-sm border-b border-border pb-2">
                <span className="text-primary">{article.title}</span>
                {article.slug && <span className="text-muted ml-2">/{article.slug}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-primary mb-3">关联标准</h2>
        {standards.length === 0 ? (
          <p className="text-sm text-muted">暂无关联标准</p>
        ) : (
          <ul className="space-y-2">
            {standards.map((standard) => (
              <li key={standard.id} className="text-sm text-primary border-b border-border pb-2">
                {standard.title}（{standard.code} / {standard.year}）
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-primary mb-3">案例图库</h2>
        {gallery.length === 0 ? (
          <p className="text-sm text-muted">暂无已审核图片</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {gallery.map((image) => (
              <a key={image.id} href={resolveUploadedImageUrl(image.imageUrl)} target="_blank" rel="noreferrer" className="block rounded border border-border overflow-hidden">
                <Image
                  src={resolveUploadedImageUrl(image.imageUrl)}
                  alt={image.title ?? "企业图片"}
                  width={400}
                  height={280}
                  className="w-full h-28 object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-primary">{value}</p>
    </div>
  );
}
