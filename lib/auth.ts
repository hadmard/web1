import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_MIN_LENGTH = 32;
const DEV_JWT_SECRET = "dev-secret-change-in-development-only";
const encoder = new TextEncoder();

let cachedSecret: Uint8Array | null = null;

function getJwtSecret() {
  if (cachedSecret) return cachedSecret;

  const configuredSecret = process.env.JWT_SECRET?.trim() ?? "";
  if (configuredSecret.length >= JWT_SECRET_MIN_LENGTH) {
    cachedSecret = encoder.encode(configuredSecret);
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`JWT_SECRET must be set to at least ${JWT_SECRET_MIN_LENGTH} characters in production.`);
  }

  cachedSecret = encoder.encode(DEV_JWT_SECRET);
  return cachedSecret;
}

export type TokenPayload = {
  sub: string;
  email: string;
  role?: string | null;
  memberType?: string | null;
};

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const sub = payload.sub as string;
    const email = payload.email as string;
    if (!sub || !email) return null;
    return {
      sub,
      email,
      role: (payload.role as string) ?? null,
      memberType: (payload.memberType as string) ?? null,
    };
  } catch {
    return null;
  }
}
