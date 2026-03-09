type Status = "draft" | "pending" | "approved" | "rejected";

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status: Status;
  isPinned?: boolean;
  authorMember?: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  } | null;
};

type ChangeRequestItem = {
  id: string;
  reason: string | null;
  diffSummary: string | null;
  patchTitle?: string | null;
  patchExcerpt?: string | null;
  patchContent?: string | null;
  article: {
    id: string;
    title: string;
    excerpt?: string | null;
    content?: string | null;
    isPinned?: boolean;
  };
  submitter: { name: string | null; email: string; role: string | null };
};

function submitterLabel(user?: { name: string | null; email: string; role: string | null } | null) {
  if (!user) return "未知账号";
  const roleLabel =
    user.role === "SUPER_ADMIN" ? "主管理员" : user.role === "ADMIN" ? "子管理员" : "会员";
  return `${user.name?.trim() || user.email}（${roleLabel}）`;
}

export function ReviewPanels({
  tab,
  pendingItems,
  pendingChanges,
  parseStandardStructuredHtml,
  onEditArticle,
  onReviewArticle,
  onEditChange,
  onReviewChange,
}: {
  tab: string;
  pendingItems: ArticleItem[];
  pendingChanges: ChangeRequestItem[];
  parseStandardStructuredHtml: (html: string) => { standardCode?: string; versionNote?: string } | null;
  onEditArticle: (item: ArticleItem) => void;
  onReviewArticle: (id: string, status: Status) => void;
  onEditChange: (item: ChangeRequestItem) => void;
  onReviewChange: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold mb-3">待审核资讯（{pendingItems.length}）</h2>
        {pendingItems.length === 0 ? (
          <p className="text-sm text-muted">暂无</p>
        ) : (
          <ul className="space-y-2">
            {pendingItems.map((item) => (
              <li key={item.id} className="border-b border-border pb-2">
                <p className="text-sm flex items-center gap-2">
                  <span>{item.title}</span>
                  {item.isPinned && <span className="text-[11px] rounded-full border border-accent/40 px-2 py-0.5 text-accent">置顶</span>}
                </p>
                {item.excerpt && <p className="text-xs text-muted mt-1 whitespace-pre-line">摘要：{item.excerpt}</p>}
                {tab === "standards" && (() => {
                  const parsed = parseStandardStructuredHtml(item.content ?? "");
                  if (!parsed) return null;
                  return (
                    <p className="text-xs text-muted mt-1">
                      标准编号：{parsed.standardCode || "未填写"} · 版本：{parsed.versionNote || "未填写"}
                    </p>
                  );
                })()}
                <p className="text-xs text-muted mt-1">提交账号：{submitterLabel(item.authorMember ?? null)}</p>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => onEditArticle(item)} className="text-xs px-2 py-1 rounded border border-border">修改后审核</button>
                  <button type="button" onClick={() => onReviewArticle(item.id, "approved")} className="text-xs px-2 py-1 rounded bg-green-600 text-white">通过</button>
                  <button type="button" onClick={() => onReviewArticle(item.id, "rejected")} className="text-xs px-2 py-1 rounded bg-red-600 text-white">驳回</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold mb-3">待审核修改申请（{pendingChanges.length}）</h2>
        {pendingChanges.length === 0 ? (
          <p className="text-sm text-muted">暂无</p>
        ) : (
          <ul className="space-y-3">
            {pendingChanges.map((item) => (
              <li key={item.id} className="border rounded p-3">
                <p className="text-sm font-medium">{item.article.title}</p>
                <p className="text-xs text-muted mt-1">提交账号：{submitterLabel(item.submitter)}</p>
                {item.reason && <p className="text-xs text-muted mt-1">说明：{item.reason}</p>}
                {item.diffSummary ? (
                  <div
                    className="mt-2 rounded border border-border bg-surface p-2 text-xs leading-5 overflow-x-auto article-diff"
                    dangerouslySetInnerHTML={{ __html: item.diffSummary }}
                  />
                ) : (
                  <div className="mt-2 rounded border border-border bg-surface p-2 text-xs text-muted space-y-1">
                    {item.patchTitle && <p>拟修改标题：{item.patchTitle}</p>}
                    {item.patchExcerpt && <p>拟修改摘要：{item.patchExcerpt}</p>}
                    {item.patchContent && <p>拟修改正文：已提交</p>}
                  </div>
                )}
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button type="button" onClick={() => onEditChange(item)} className="text-xs px-2 py-1 rounded border border-border">
                    查看并调整后通过
                  </button>
                  <button type="button" onClick={() => onReviewChange(item.id, "approved")} className="text-xs px-2 py-1 rounded bg-green-600 text-white">直接通过</button>
                  <button type="button" onClick={() => onReviewChange(item.id, "rejected")} className="text-xs px-2 py-1 rounded bg-red-600 text-white">驳回</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
