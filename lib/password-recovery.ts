import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

export function normalizeRecoveryEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  return { token, tokenHash, expiresAt };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canRequestPasswordReset(lastRequestedAt: Date | null | undefined) {
  if (!lastRequestedAt) return true;
  return Date.now() - lastRequestedAt.getTime() >= PASSWORD_RESET_COOLDOWN_MS;
}

export function buildPasswordResetUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/membership/reset-password?token=${encodeURIComponent(token)}`;
}

type ResettableMember = {
  id: string;
  email: string;
  recoveryEmail: string | null;
  passwordResetRequestedAt: Date | null;
};

type SendPasswordResetEmailInput = {
  to: string;
  account: string;
  resetUrl: string;
};

type SendPasswordResetEmailResult =
  | { mode: "resend" }
  | { mode: "debug"; resetUrl: string };

export async function issuePasswordResetForMember(input: {
  member: ResettableMember;
  origin: string;
}) {
  const deliveryEmail =
    normalizeRecoveryEmail(input.member.recoveryEmail) ||
    (input.member.email.includes("@") ? normalizeRecoveryEmail(input.member.email) : null);

  if (!deliveryEmail) {
    return { ok: false as const, reason: "missing_recovery_email" as const };
  }

  if (!canRequestPasswordReset(input.member.passwordResetRequestedAt)) {
    return { ok: false as const, reason: "cooldown" as const };
  }

  const { token, tokenHash, expiresAt } = createPasswordResetToken();
  await prisma.member.update({
    where: { id: input.member.id },
    data: {
      recoveryEmail: deliveryEmail,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
      passwordResetRequestedAt: new Date(),
    },
  });

  const resetUrl = buildPasswordResetUrl(input.origin, token);
  const delivery = await sendPasswordResetEmail({
    to: deliveryEmail,
    account: input.member.email,
    resetUrl,
  });

  return {
    ok: true as const,
    deliveryEmail,
    resetUrl,
    delivery,
  };
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput
): Promise<SendPasswordResetEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (resendApiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: "整木网账号密码重置",
        html: `
          <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.7;color:#1f2937">
            <p>您好，</p>
            <p>我们收到账号 <strong>${escapeHtml(input.account)}</strong> 的密码重置申请。</p>
            <p>请在 30 分钟内点击下面的链接重设密码：</p>
            <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
            <p>如果这不是您的操作，请忽略这封邮件。</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`发送重置邮件失败: ${response.status} ${text}`.trim());
    }

    return { mode: "resend" };
  }

  console.info("[password-recovery] debug_reset_link", {
    account: input.account,
    to: input.to,
    resetUrl: input.resetUrl,
  });

  return { mode: "debug", resetUrl: input.resetUrl };
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
