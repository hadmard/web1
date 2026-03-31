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
  draft: "border-[rgba(148,163,184,0.35)] bg-slate-50 text-slate-600",
  pending: "border-[rgba(245,158,11,0.35)] bg-amber-50 text-amber-700",
  approved: "border-[rgba(34,197,94,0.35)] bg-emerald-50 text-emerald-700",
  rejected: "border-[rgba(239,68,68,0.35)] bg-red-50 text-red-600",
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

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(191,173,138,0.22)] bg-[rgba(255,255,255,0.82)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[#9f8964]">{label}</span>
      <span className="text-[13px] font-medium text-[#65543b]">{value}</span>
    </span>
  );
}

function ViewCountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(201,166,92,0.34)] bg-[linear-gradient(135deg,rgba(250,245,234,0.98),rgba(245,232,204,0.96))] px-3.5 py-1.5 shadow-[0_10px_22px_rgba(185,156,96,0.14)]">
      <span className="text-[10px] uppercase tracking-[0.16em] text-[#a88445]">阅读量</span>
      <span className="text-[13px] font-semibold text-[#7b5c23]">{value}</span>
    </span>
  );
}

export function ManageContentList({
  items,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  highlightedItemId,
}: {
  items: ArticleItem[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (item: ArticleItem) => void;
  onDelete: (id: string) => void;
  highlightedItemId?: string | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-5">
      {items.length === 0 ? (
        <p className="text-sm text-muted">暂无内容</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const highlighted = highlightedItemId === item.id;
            return (
              <li
                key={item.id}
                id={`manage-article-${item.id}`}
                className={`flex items-start justify-between gap-4 rounded-[18px] border-b border-border pb-3 transition ${
                  highlighted
                    ? "bg-[rgba(201,166,92,0.08)] px-3 py-3 ring-1 ring-[rgba(191,156,91,0.26)] shadow-[0_10px_24px_rgba(185,156,96,0.12)]"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[15px] font-medium text-primary">
                    {item.previewHref ? (
                      <a
                        href={item.previewHref}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate transition-colors hover:text-accent"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span className="truncate">{item.title}</span>
                    )}
                    {item.isPinned ? (
                      <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-medium text-accent">
                        置顶
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2.5 text-xs text-muted">
                    <MetaItem label="提交账号" value={submitterLabel(item.authorMember ?? null)} />
                    <MetaItem label="发布时间" value={formatPublishedAt(item.publishedAt)} />
                    {item.status === "approved" ? <ViewCountBadge value={item.viewCount ?? 0} /> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium ${STATUS_CLASSNAME[item.status]}`}
                  >
                    {STATUS_TEXT[item.status]}
                  </span>
                  {item.status === "approved" && item.previewHref ? (
                    <a
                      href={item.previewHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[rgba(194,182,154,0.3)] px-3 py-1.5 text-xs text-primary transition hover:bg-[rgba(247,243,235,0.7)]"
                    >
                      查看
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={!canEdit}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-primary transition hover:border-[rgba(194,182,154,0.3)] hover:bg-[rgba(247,243,235,0.7)] disabled:opacity-40"
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    disabled={!canDelete}
                    className="rounded-full border border-red-500 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
