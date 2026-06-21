import { createHash, randomBytes, randomUUID } from "crypto";
import nodemailer from "nodemailer";
import { PUBLIC_SITE_URL } from "@/lib/public-site-config";
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

export function getPasswordResetOrigin() {
  return PUBLIC_SITE_URL.replace(/\/$/, "");
}

export function buildPasswordResetUrl(token: string) {
  return `${getPasswordResetOrigin()}/membership/reset-password?token=${encodeURIComponent(token)}`;
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
  requestId?: string;
};

type PasswordResetEmailConfig =
  | {
      mode: "smtp";
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    }
  | { mode: "resend"; resendApiKey: string; from: string }
  | { mode: "debug" }
  | { mode: "disabled"; missing: string[] };

type SendPasswordResetEmailResult =
  | { mode: "smtp" }
  | { mode: "resend" }
  | { mode: "debug"; resetUrl: string };

type PasswordResetIssueResult =
  | {
      ok: true;
      deliveryEmail: string;
      resetUrl: string;
      delivery: SendPasswordResetEmailResult;
    }
  | { ok: false; reason: "missing_recovery_email" }
  | { ok: false; reason: "cooldown" }
  | { ok: false; reason: "email_service_unavailable"; missingConfig: string[] };

function maskEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  const [localPart, domain = ""] = normalized.split("@");
  if (!localPart) return domain ? `***@${domain}` : "***";
  const safeLocal =
    localPart.length <= 2
      ? `${localPart.slice(0, 1)}***`
      : `${localPart.slice(0, 1)}***${localPart.slice(-1)}`;
  return domain ? `${safeLocal}@${domain}` : safeLocal;
}

function maskAccount(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("@")) return maskEmail(normalized);
  if (normalized.length <= 2) return `${normalized.slice(0, 1)}***`;
  if (normalized.length <= 4) return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
}

function logPasswordRecoveryEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>
) {
  console[level](event, payload);
}

function parseBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return null;
}

function getPasswordResetEmailConfig(): PasswordResetEmailConfig {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortRaw = process.env.SMTP_PORT?.trim();
  const smtpSecureRaw = process.env.SMTP_SECURE?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (smtpHost && smtpPortRaw && smtpUser && smtpPass && from) {
    const port = Number.parseInt(smtpPortRaw, 10);
    if (Number.isFinite(port) && port > 0) {
      const secure = parseBooleanEnv(smtpSecureRaw) ?? port === 465;
      return {
        mode: "smtp",
        host: smtpHost,
        port,
        secure,
        user: smtpUser,
        pass: smtpPass,
        from,
      };
    }
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey && from) {
    return { mode: "resend", resendApiKey, from };
  }

  if (process.env.NODE_ENV === "production") {
    const smtpMissing = [
      !smtpHost ? "SMTP_HOST" : null,
      !smtpPortRaw ? "SMTP_PORT" : null,
      !smtpUser ? "SMTP_USER" : null,
      !smtpPass ? "SMTP_PASS" : null,
      !from ? "MAIL_FROM" : null,
    ].filter((value): value is string => Boolean(value));

    const resendMissing = [
      !resendApiKey ? "RESEND_API_KEY" : null,
      !from ? "MAIL_FROM" : null,
    ].filter((value): value is string => Boolean(value));

    const missing = Array.from(new Set([...smtpMissing, ...resendMissing]));
    return { mode: "disabled", missing };
  }

  return { mode: "debug" };
}

function buildPasswordResetEmailHtml(input: SendPasswordResetEmailInput) {
  return `
    <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.7;color:#1f2937">
      <p>您好：</p>
      <p>我们收到了账号 <strong>${escapeHtml(input.account)}</strong> 的密码重置申请。</p>
      <p>请在 30 分钟内点击下面的链接重设密码：</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>如果这不是您的操作，请忽略这封邮件。</p>
    </div>
  `;
}

export async function issuePasswordResetForMember(input: {
  member: ResettableMember;
}): Promise<PasswordResetIssueResult> {
  const requestId = randomUUID();
  const deliveryEmail =
    normalizeRecoveryEmail(input.member.recoveryEmail) ||
    (input.member.email.includes("@") ? normalizeRecoveryEmail(input.member.email) : null);

  if (!deliveryEmail) {
    return { ok: false, reason: "missing_recovery_email" };
  }

  if (!canRequestPasswordReset(input.member.passwordResetRequestedAt)) {
    return { ok: false, reason: "cooldown" };
  }

  const emailConfig = getPasswordResetEmailConfig();
  if (emailConfig.mode === "disabled") {
    return {
      ok: false,
      reason: "email_service_unavailable",
      missingConfig: emailConfig.missing,
    };
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

  const resetUrl = buildPasswordResetUrl(token);
  const delivery = await sendPasswordResetEmail(
    {
      to: deliveryEmail,
      account: input.member.email,
      resetUrl,
      requestId,
    },
    emailConfig
  );

  return {
    ok: true,
    deliveryEmail,
    resetUrl,
    delivery,
  };
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
  config: PasswordResetEmailConfig = getPasswordResetEmailConfig()
): Promise<SendPasswordResetEmailResult> {
  if (config.mode === "smtp") {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: "整木网账号密码重置",
      html: buildPasswordResetEmailHtml(input),
    });

    return { mode: "smtp" };
  }

  if (config.mode === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: "整木网账号密码重置",
        html: buildPasswordResetEmailHtml(input),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`发送重置邮件失败: ${response.status} ${text}`.trim());
    }

    return { mode: "resend" };
  }

  if (config.mode === "disabled") {
    throw new Error(`密码重置邮件服务未配置: ${config.missing.join(", ")}`);
  }

  logPasswordRecoveryEvent("info", "[password-recovery] debug_reset_link", {
    requestId: input.requestId ?? "n/a",
    stage: "send_password_reset_email",
    success: true,
    mode: config.mode,
    accountMasked: maskAccount(input.account),
    deliveryEmailMasked: maskEmail(input.to),
    resetUrlGenerated: Boolean(input.resetUrl),
    tokenIncluded: input.resetUrl.includes("token="),
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
