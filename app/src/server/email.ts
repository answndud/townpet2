import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const appBaseUrl =
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.AUTH_URL ??
  "http://localhost:3000";

type PasswordResetEmailParams = {
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

  await resend.emails.send({
    from: "TownPet <no-reply@townpet.dev>",
    to: email,
    subject,
    text,
    html,
  });
}
