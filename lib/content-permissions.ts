import type { Session } from "@/lib/session";

type OwnerInput = {
  authorMemberId: string | null;
};

export function canReviewSubmissions(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export function canChangeReviewStatus(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export function canDirectlyEditArticle(session: Session | null, article: OwnerInput): boolean {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role !== "ADMIN") return false;
  if (session.canEditAllContent) return true;
  if (article.authorMemberId && article.authorMemberId === session.sub) return session.canEditOwnContent;
  return session.canEditMemberContent;
}

export function canDirectlyDeleteArticle(session: Session | null, article: OwnerInput): boolean {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role !== "ADMIN") return false;
  if (session.canDeleteAllContent) return true;
  if (article.authorMemberId && article.authorMemberId === session.sub) return session.canDeleteOwnContent;
  return session.canDeleteMemberContent;
}
