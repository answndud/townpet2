import { describe, expect, it } from "vitest";

import {
  buildNotificationListHref,
  parseNotificationFilterKind,
  parseUnreadOnly,
} from "@/lib/notification-filter";

describe("notification-filter", () => {
  it("필터 kind를 안전하게 정규화한다", () => {
    expect(parseNotificationFilterKind("ALL")).toBe("ALL");
    expect(parseNotificationFilterKind("COMMENT")).toBe("COMMENT");
    expect(parseNotificationFilterKind("REACTION")).toBe("REACTION");
    expect(parseNotificationFilterKind("SYSTEM")).toBe("SYSTEM");
    expect(parseNotificationFilterKind("UNKNOWN")).toBe("ALL");
    expect(parseNotificationFilterKind(undefined)).toBe("ALL");
  });

  it("읽지 않음 플래그를 파싱한다", () => {
    expect(parseUnreadOnly("1")).toBe(true);
    expect(parseUnreadOnly("true")).toBe(true);
    expect(parseUnreadOnly("0")).toBe(false);
    expect(parseUnreadOnly("false")).toBe(false);
    expect(parseUnreadOnly(undefined)).toBe(false);
  });

  it("필터 상태로 알림 URL을 생성한다", () => {
    expect(buildNotificationListHref("ALL", false)).toBe("/notifications");
    expect(buildNotificationListHref("COMMENT", false)).toBe(
      "/notifications?kind=COMMENT",
    );
    expect(buildNotificationListHref("ALL", true)).toBe(
      "/notifications?unreadOnly=1",
    );
    expect(buildNotificationListHref("REACTION", true)).toBe(
      "/notifications?kind=REACTION&unreadOnly=1",
    );
  });
});
