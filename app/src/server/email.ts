import { Resend } from "resend";

import { runtimeEnv } from "@/lib/env";
import { logger, serializeError } from "@/server/logger";
import { ServiceError } from "@/server/services/service-error";

let hasWarnedMissingApiKey = false;

function getResendClient(required: boolean) {
  if (!runtimeEnv.resendApiKey) {
    if (!hasWarnedMissingApiKey) {
      hasWarnedMissingApiKey = true;
      logger.warn("RESEND_API_KEY가 없어 이메일 전송을 건너뜁니다.");
    }

    if (required && runtimeEnv.isProduction) {
      throw new ServiceError(
        "이메일 전송 설정이 준비되지 않았습니다. 관리자에게 문의해 주세요.",
        "EMAIL_DELIVERY_NOT_CONFIGURED",
        503,
      );
    }

    return null;
  }

  return new Resend(runtimeEnv.resendApiKey);
}

async function sendEmail(params: {
  kind: "password-reset" | "email-verification" | "welcome";
  to: string;
  subject: string;
  text: string;
  html: string;
  required?: boolean;
}) {
  const required = params.required ?? false;
  const resend = getResendClient(required);
  if (!resend) {
    return;
  }

  try {
    const result = await resend.emails.send({
      from: "TownPet <no-reply@townpet.dev>",
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      throw result.error;
    }
  } catch (error) {
    if (required && runtimeEnv.isProduction) {
      logger.error("필수 이메일 전송에 실패했습니다.", {
        kind: params.kind,
        error: serializeError(error),
      });
      throw new ServiceError(
        "이메일을 전송할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        "EMAIL_DELIVERY_UNAVAILABLE",
        503,
      );
    }

    logger.warn("선택 이메일 전송에 실패했습니다.", {
      kind: params.kind,
      error: serializeError(error),
    });
  }
}

const appBaseUrl =
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.AUTH_URL ??
  "http://localhost:3000";

type PasswordResetEmailParams = {
  email: string;
  token: string;
};

type EmailVerificationParams = {
  email: string;
  token: string;
};

export async function sendPasswordResetEmail({
  email,
  token,
}: PasswordResetEmailParams) {
  const resetUrl = `${appBaseUrl}/password/reset?token=${token}`;
  const subject = "TownPet 비밀번호 재설정";
  const text = `아래 링크에서 비밀번호를 재설정해 주세요.\n\n${resetUrl}\n\n유효시간: 1시간`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #2a241c; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">TownPet 비밀번호 재설정</h2>
      <p style="margin: 0 0 12px;">아래 버튼을 눌러 비밀번호를 재설정해 주세요.</p>
      <p style="margin: 0 0 24px;">
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 18px; background: #2a241c; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px;">
          비밀번호 재설정
        </a>
      </p>
      <p style="margin: 0 0 12px; font-size: 12px; color: #6f6046;">버튼이 동작하지 않으면 아래 링크를 복사해 주세요.</p>
      <p style="margin: 0 0 24px; font-size: 12px; color: #6f6046; word-break: break-all;">${resetUrl}</p>
      <p style="margin: 0; font-size: 12px; color: #6f6046;">유효시간: 1시간</p>
    </div>
  `;

  await sendEmail({
    kind: "password-reset",
    to: email,
    subject,
    text,
    html,
    required: true,
  });
}

export async function sendVerificationEmail({ email, token }: EmailVerificationParams) {
  const verifyUrl = `${appBaseUrl}/verify-email?token=${token}`;
  const subject = "TownPet 이메일 인증";
  const text = `아래 링크에서 이메일 인증을 완료해 주세요.\n\n${verifyUrl}\n\n유효시간: 1시간`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #2a241c; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">TownPet 이메일 인증</h2>
      <p style="margin: 0 0 12px;">아래 버튼을 눌러 이메일 인증을 완료해 주세요.</p>
      <p style="margin: 0 0 24px;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 18px; background: #2a241c; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px;">
          이메일 인증 완료
        </a>
      </p>
      <p style="margin: 0 0 12px; font-size: 12px; color: #6f6046;">버튼이 동작하지 않으면 아래 링크를 복사해 주세요.</p>
      <p style="margin: 0 0 24px; font-size: 12px; color: #6f6046; word-break: break-all;">${verifyUrl}</p>
      <p style="margin: 0; font-size: 12px; color: #6f6046;">유효시간: 1시간</p>
    </div>
  `;

  await sendEmail({
    kind: "email-verification",
    to: email,
    subject,
    text,
    html,
    required: true,
  });
}

export async function sendWelcomeEmail(email: string) {
  const subject = "TownPet에 오신 것을 환영합니다";
  const text = "이메일 인증이 완료되었습니다. 이제 TownPet을 시작해 보세요.";
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #2a241c; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">환영합니다!</h2>
      <p style="margin: 0 0 12px;">이메일 인증이 완료되었습니다.</p>
      <p style="margin: 0 0 12px;">이제 TownPet에서 동네 정보를 둘러보고, 첫 글을 작성해 보세요.</p>
      <p style="margin: 0; font-size: 12px; color: #6f6046;">감사합니다.</p>
    </div>
  `;

  await sendEmail({
    kind: "welcome",
    to: email,
    subject,
    text,
    html,
  });
}
