import { getContentLocationLabel } from "@/lib/content-taxonomy";

type Status = "draft" | "pending" | "approved" | "rejected";

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status: Status;
  sourceType?: string | null;
  source?: string | null;
  generationBatchId?: string | null;
  isPinned?: boolean;
  categoryHref?: string | null;
  subHref?: string | null;
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
    categoryHref?: string | null;
    subHref?: string | null;
  };
  submitter: { name: string | null; email: string; role: string | null };
};

const TEXT = {
  unknownUser: "未知账号",
  superAdmin: "主管理员",
  admin: "子管理员",
  member: "会员",
  seoDraft: "SEO 草稿",
  noSeoDraft: "暂无自动生成的 SEO 草稿",
  pendingArticles: "待审核资讯",
  pendingChanges: "待审核修改申请",
  empty: "暂无",
  pinned: "置顶",
  summary: "摘要",
  batch: "批次",
  submitter: "提交账号",
  standardCode: "标准编号",
  version: "版本",
  notFilled: "未填写",
  editThenReview: "修改后审核",
  approve: "通过",
  reject: "驳回",
  reason: "说明",
  draftTitle: "拟修改标题",
  draftExcerpt: "拟修改摘要",
  draftContent: "拟修改正文：已提交",
  reviewWithAdjustments: "查看并调整后通过",
  directApprove: "直接通过",
  category: "栏目",
} as const;

function submitterLabel(user?: { name: string | null; email: string; role: string | null } | null) {
  if (!user) return TEXT.unknownUser;
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? TEXT.superAdmin
      : user.role === "ADMIN"
        ? TEXT.admin
        : TEXT.member;
  return `${user.name?.trim() || user.email} (${roleLabel})`;
}

function LocationLine({ categoryHref, subHref }: { categoryHref?: string | null; subHref?: string | null }) {
  const location = getContentLocationLabel(categoryHref, subHref);
  return <p className="mt-1 text-xs text-muted">{`${TEXT.category}: ${location.fullLabel}`}</p>;
}

function ArticleReviewList({
  tab,
  title,
  emptyText,
  items,
  parseStandardStructuredHtml,
  onEditArticle,
  onReviewArticle,
}: {
  tab: string;
  title: string;
  emptyText: string;
  items: ArticleItem[];
  parseStandardStructuredHtml: (html: string) => { standardCode?: string; versionNote?: string } | null;
  onEditArticle: (item: ArticleItem) => void;
  onReviewArticle: (id: string, status: Status) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <h2 className="mb-3 text-sm font-semibold">{`${title} (${items.length})`}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span>{item.title}</span>
                {item.isPinned && (
                  <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">
                    {TEXT.pinned}
                  </span>
                )}
                {(item.sourceType === "ai_generated" || item.source === "auto_seo_generator") && (
                  <span className="rounded-full border border-[rgba(180,154,107,0.38)] bg-[rgba(180,154,107,0.08)] px-2 py-0.5 text-[11px] text-primary">
                    {TEXT.seoDraft}
                  </span>
                )}
              </p>
              <LocationLine categoryHref={item.categoryHref} subHref={item.subHref} />
              {item.excerpt && (
                <p className="mt-1 whitespace-pre-line text-xs text-muted">{`${TEXT.summary}: ${item.excerpt}`}</p>
              )}
              {(item.sourceType === "ai_generated" || item.source === "auto_seo_generator") && item.generationBatchId && (
                <p className="mt-1 text-xs text-muted">{`${TEXT.batch}: ${item.generationBatchId}`}</p>
              )}
              {tab === "standards" && (() => {
                const parsed = parseStandardStructuredHtml(item.content ?? "");
                if (!parsed) return null;
                return (
                  <p className="mt-1 text-xs text-muted">
                    {`${TEXT.standardCode}: ${parsed.standardCode || TEXT.notFilled} | ${TEXT.version}: ${parsed.versionNote || TEXT.notFilled}`}
                  </p>
                );
              })()}
              <p className="mt-1 text-xs text-muted">{`${TEXT.submitter}: ${submitterLabel(item.authorMember ?? null)}`}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditArticle(item)}
                  className="rounded border border-border px-2 py-1 text-xs"
                >
                  {TEXT.editThenReview}
                </button>
                <button
                  type="button"
                  onClick={() => onReviewArticle(item.id, "approved")}
                  className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                >
                  {TEXT.approve}
                </button>
                <button
                  type="button"
                  onClick={() => onReviewArticle(item.id, "rejected")}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                >
                  {TEXT.reject}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  const seoPendingItems = pendingItems.filter((item) => item.sourceType === "ai_generated" || item.source === "auto_seo_generator");
  const regularPendingItems = pendingItems.filter((item) => item.sourceType !== "ai_generated" && item.source !== "auto_seo_generator");

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-4">
        <ArticleReviewList
          tab={tab}
          title={TEXT.seoDraft}
          emptyText={TEXT.noSeoDraft}
          items={seoPendingItems}
          parseStandardStructuredHtml={parseStandardStructuredHtml}
          onEditArticle={onEditArticle}
          onReviewArticle={onReviewArticle}
        />
        <ArticleReviewList
          tab={tab}
          title={TEXT.pendingArticles}
          emptyText={TEXT.empty}
          items={regularPendingItems}
          parseStandardStructuredHtml={parseStandardStructuredHtml}
          onEditArticle={onEditArticle}
          onReviewArticle={onReviewArticle}
        />
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="mb-3 text-sm font-semibold">{`${TEXT.pendingChanges} (${pendingChanges.length})`}</h2>
        {pendingChanges.length === 0 ? (
          <p className="text-sm text-muted">{TEXT.empty}</p>
        ) : (
          <ul className="space-y-3">
            {pendingChanges.map((item) => (
              <li key={item.id} className="rounded border p-3">
                <p className="text-sm font-medium">{item.article.title}</p>
                <LocationLine categoryHref={item.article.categoryHref} subHref={item.article.subHref} />
                <p className="mt-1 text-xs text-muted">{`${TEXT.submitter}: ${submitterLabel(item.submitter)}`}</p>
                {item.reason && <p className="mt-1 text-xs text-muted">{`${TEXT.reason}: ${item.reason}`}</p>}
                {item.diffSummary ? (
                  <div
                    className="article-diff mt-2 overflow-x-auto rounded border border-border bg-surface p-2 text-xs leading-5"
                    dangerouslySetInnerHTML={{ __html: item.diffSummary }}
                  />
                ) : (
                  <div className="mt-2 space-y-1 rounded border border-border bg-surface p-2 text-xs text-muted">
                    {item.patchTitle && <p>{`${TEXT.draftTitle}: ${item.patchTitle}`}</p>}
                    {item.patchExcerpt && <p>{`${TEXT.draftExcerpt}: ${item.patchExcerpt}`}</p>}
                    {item.patchContent && <p>{TEXT.draftContent}</p>}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditChange(item)}
                    className="rounded border border-border px-2 py-1 text-xs"
                  >
                    {TEXT.reviewWithAdjustments}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReviewChange(item.id, "approved")}
                    className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                  >
                    {TEXT.directApprove}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReviewChange(item.id, "rejected")}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    {TEXT.reject}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
