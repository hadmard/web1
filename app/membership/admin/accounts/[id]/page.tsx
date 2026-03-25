import Link from "next/link";
import { notFound } from "next/navigation";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdminOrSuper } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

function roleLabel(role: string | null) {
  if (role === "SUPER_ADMIN") return "主管理员";
  if (role === "ADMIN") return "子管理员";
  return "会员";
}

export default async function AdminAccountDetailPage({ params }: Props) {
  const session = await getSession();
  if (!requireAdminOrSuper(session)) {
    return <div className="text-sm text-muted">需要管理员权限。</div>;
  }

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      memberType: true,
      createdAt: true,
      enterprise: {
        select: {
          id: true,
          companyName: true,
          companyShortName: true,
          region: true,
          area: true,
          contactPerson: true,
          contactPhone: true,
          website: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!member) notFound();

  const enterpriseName = member.enterprise?.companyShortName || member.enterprise?.companyName || "未绑定企业";
  const location = [member.enterprise?.region, member.enterprise?.area].filter(Boolean).join(" · ");

  return (
    <div className="max-w-5xl space-y-6">
      <InlinePageBackLink href="/membership/admin/accounts" label="返回账号一览" />

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Member Detail</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">{member.name?.trim() || member.email}</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            账号：{member.email} · 角色：{roleLabel(member.role)} · 会员类型：{member.memberType}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">企业信息</h2>
          <div className="mt-5 grid gap-3">
            <InfoRow label="企业名称" value={enterpriseName} />
            <InfoRow label="品牌名称" value={member.enterprise?.brand?.name || "未绑定品牌"} />
            <InfoRow label="地区" value={location || "未填写"} />
            <InfoRow label="联系人" value={member.enterprise?.contactPerson || "未填写"} />
            <InfoRow label="电话" value={member.enterprise?.contactPhone || "未填写"} />
            <InfoRow label="官网" value={member.enterprise?.website || "未填写"} />
            <InfoRow label="注册时间" value={member.createdAt.toLocaleString("zh-CN")} />
          </div>
        </article>

        <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">快捷入口</h2>
          <div className="mt-5 space-y-3">
            {member.enterprise ? (
              <Link
                href={`/enterprise/${member.enterprise.id}`}
                className="block rounded-[22px] border border-border bg-white px-4 py-3 text-sm text-primary transition hover:bg-surface"
              >
                查看企业前台页面
              </Link>
            ) : null}
            {member.enterprise?.brand ? (
              <Link
                href={`/brands/${member.enterprise.brand.slug}`}
                className="block rounded-[22px] border border-border bg-white px-4 py-3 text-sm text-primary transition hover:bg-surface"
              >
                查看品牌详情入口
              </Link>
            ) : null}
            <Link
              href="/membership/admin/brands"
              className="block rounded-[22px] border border-border bg-white px-4 py-3 text-sm text-primary transition hover:bg-surface"
            >
              前往品牌展示管理
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-white px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-primary">{value}</span>
    </div>
  );
}
