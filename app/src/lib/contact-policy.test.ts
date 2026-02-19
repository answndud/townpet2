import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  detectContactSignals,
  maskContactSignals,
  moderateContactContent,
} from "@/lib/contact-policy";

describe("contact policy", () => {
  it("detects phone/email/open chat signals", () => {
    const text =
      "문의: 010-1234-5678, 이메일 hello@example.com, https://open.kakao.com/o/demo";
    const signals = detectContactSignals(text);

    expect(signals).toContain("phone");
    expect(signals).toContain("email");
    expect(signals).toContain("open_kakao");
  });

  it("masks phone/email/contact links", () => {
    const text =
      "연락처 01012345678 / test@townpet.dev / https://open.kakao.com/o/demo / https://t.me/demo";
    const masked = maskContactSignals(text);

    expect(masked).toContain("010-****-5678");
    expect(masked).toContain("te***@townpet.dev");
    expect(masked).toContain("[오픈채팅 링크 비공개]");
    expect(masked).toContain("[메신저 링크 비공개]");
  });

  it("blocks new users who include contact signals", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");
    const createdAt = new Date("2026-02-19T09:00:00.000Z");
    const text = "카카오톡 아이디: townpet123";

    const result = moderateContactContent({
      text,
      role: UserRole.USER,
      accountCreatedAt: createdAt,
      now,
    });

    expect(result.blocked).toBe(true);
    expect(result.signals).toContain("kakao_id");
    expect(result.message).toContain("24시간");
  });

  it("masks but does not block old users or moderators", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");

    const oldUserResult = moderateContactContent({
      text: "문의 010-1111-2222",
      role: UserRole.USER,
      accountCreatedAt: new Date("2026-02-17T08:00:00.000Z"),
      now,
    });
    expect(oldUserResult.blocked).toBe(false);
    expect(oldUserResult.sanitizedText).toContain("010-****-2222");

    const moderatorResult = moderateContactContent({
      text: "문의 010-1111-2222",
      role: UserRole.MODERATOR,
      accountCreatedAt: new Date("2026-02-19T11:30:00.000Z"),
      now,
    });
    expect(moderatorResult.blocked).toBe(false);
  });
});
