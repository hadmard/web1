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

function submitterLabel(user?: { name: string | null; email: string; role: string | null } | null) {
  if (!user) return "未知账号";
  const roleLabel = user.role === "SUPER_ADMIN" ? "主管理员" : user.role === "ADMIN" ? "子管理员" : "会员";
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

function formatMeta(item: ArticleItem) {
  return `提交账号：${submitterLabel(item.authorMember ?? null)}  发布时间：${formatPublishedAt(item.publishedAt)}${
    item.status === "approved" ? `  阅读量：${item.viewCount ?? 0}` : ""
  }`;
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
            <li key={item.id} className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <p className="flex items-center gap-2 text-sm">
                  {item.previewHref ? (
                    <a href={item.previewHref} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <span>{item.title}</span>
                  )}
                  {item.isPinned ? (
                    <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">置顶</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  {item.slug} 路 {STATUS_TEXT[item.status]}
                </p>
                <p className="mt-1 text-xs text-muted">{formatMeta(item)}</p>
              </div>
              <div className="flex gap-2">
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
