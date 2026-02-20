import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export type Session = { sub: string; email: string; role: string | null };

/** 服务端获取当前登录用户（含角色），未登录返回 null */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role ?? null,
  };
}

export function requireSuperAdmin(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN";
}

export function requireAdminOrSuper(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}
