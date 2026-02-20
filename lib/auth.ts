import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

export type TokenPayload = { sub: string; email: string; role?: string | null };

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sub = payload.sub as string;
    const email = payload.email as string;
    if (!sub || !email) return null;
    return { sub, email, role: (payload.role as string) ?? null };
  } catch {
    return null;
  }
}
