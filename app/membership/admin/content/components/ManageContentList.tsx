type Status = "draft" | "pending" | "approved" | "rejected";

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: Status;
  isPinned?: boolean;
  publishedAt?: string | null;
  viewCount?: number;
  previewHref?: string | null;
  authorMember?: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  } | null;
};

const STATUS_TEXT: Record<Status, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已发布",
  rejected: "已驳回",
};

const STATUS_CLASSNAME: Record<Status, string> = {
  draft: "border-[rgba(148,163,184,0.35)] text-slate-600 bg-slate-50",
  pending: "border-[rgba(245,158,11,0.35)] text-amber-700 bg-amber-50",
  approved: "border-[rgba(34,197,94,0.35)] text-emerald-700 bg-emerald-50",
  rejected: "border-[rgba(239,68,68,0.35)] text-red-600 bg-red-50",
};

function submitterLabel(user?: { name: string | null; email: string; role: string | null } | null) {
  if (!user) return "未知账号";
  const roleLabel = user?.role === "SUPER_ADMIN" ? "主管理员" : user?.role === "ADMIN" ? "子管理员" : "会员";
  return `${user.name?.trim() || user.email}（${roleLabel}）`;
}

function formatPublishedAt(value?: string | null) {
  if (!value) return "未发布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未发布";

  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#8f7b59]">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function ManageContentList({
  items,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  items: ArticleItem[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (item: ArticleItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-5">
      {items.length === 0 ? (
        <p className="text-sm text-muted">暂无内容</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm">
                  {item.previewHref ? (
                    <a href={item.previewHref} target="_blank" rel="noreferrer" className="truncate hover:text-accent hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <span className="truncate">{item.title}</span>
                  )}
                  {item.isPinned ? (
                    <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">置顶</span>
                  ) : null}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
                  <MetaItem label="账号" value={submitterLabel(item.authorMember ?? null)} />
                  <MetaItem label="发布时间" value={formatPublishedAt(item.publishedAt)} />
                  {item.status === "approved" ? <MetaItem label="阅读量" value={String(item.viewCount ?? 0)} /> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex min-w-[68px] items-center justify-center rounded border px-2.5 py-1 text-xs ${STATUS_CLASSNAME[item.status]}`}
                >
                  {STATUS_TEXT[item.status]}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  disabled={!canEdit}
                  className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
                >
                  修改
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={!canDelete}
                  className="rounded border border-red-500 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
